import { saveAs } from 'file-saver'
import '@/utils/ensureBufferPolyfill.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectHasMissingUsage } from '@/composables/file-upload/surveyUsagePending.js'
import {
  resolveVisibleColumnDefs,
  formatSummaryCellValue,
  buildExcelHeaderPlan,
  formatAreaDigits,
} from '@/composables/project-list/summaryExportColumnSchema.js'
import { SUMMARY_COMPARISON_GROUP_META } from '@/composables/project-list/summaryComparisonGroupMeta.js'

const comparisonGroupMeta = SUMMARY_COMPARISON_GROUP_META.map((item) => ({
  key: item.key,
  title: item.printTitle || item.title,
}))

const formatComparisonArea = (value) => formatAreaDigits(value, '-')

const buildComparisonRows = (tripleLine) => [
  [
    '建筑面积',
    formatComparisonArea(tripleLine?.totalBuilding?.contractAgreedArea),
    formatComparisonArea(tripleLine?.totalBuilding?.buildableArea),
    formatComparisonArea(tripleLine?.totalBuilding?.difference),
  ],
  [
    '商业面积',
    formatComparisonArea(tripleLine?.commercial?.contractAgreedArea),
    formatComparisonArea(tripleLine?.commercial?.buildableArea),
    formatComparisonArea(tripleLine?.commercial?.difference),
  ],
  [
    '住宅面积',
    formatComparisonArea(tripleLine?.residential?.contractAgreedArea),
    formatComparisonArea(tripleLine?.residential?.buildableArea),
    formatComparisonArea(tripleLine?.residential?.difference),
  ],
]

/** Excel 各列的最小宽度，文本列会再根据实际内容自动扩宽 */
const EXCEL_MIN_WIDTH_BY_ID = {
  index: 6,
  projectName: 22,
  certNo: 20,
  contractNo: 18,
  phase: 8,
  totalArea: 18,
  calcCommercial: 11,
  calcResidential: 11,
  calcPropMgmt: 11,
  calcOther: 11,
  nonCalcCommunity: 11,
  nonCalcOther: 11,
  areaConfirmationNoticeNo: 22,
  reportNo: 24,
  remarks: 14,
}

/** 限制文本列的最大宽度，极长内容在达到上限后改为自动换行 */
const EXCEL_MAX_WIDTH_BY_ID = {
  projectName: 56,
  certNo: 40,
  contractNo: 34,
  phase: 12,
  areaConfirmationNoticeNo: 38,
  reportNo: 38,
  remarks: 40,
}

function getExcelDisplayWidth(value) {
  const lines = String(value ?? '').split(/\r?\n/)
  return Math.max(
    0,
    ...lines.map((line) =>
      Array.from(line).reduce((width, char) => width + (char.codePointAt(0) > 0xff ? 2 : 1), 0)
    )
  )
}

function resolveExcelColumnWidth(def, values) {
  const minWidth = EXCEL_MIN_WIDTH_BY_ID[def.id] || 12
  if (def.kind !== 'text') return minWidth

  const contentWidth = Math.max(
    getExcelDisplayWidth(def.subLabel),
    ...values.map(getExcelDisplayWidth)
  )
  const maxWidth = EXCEL_MAX_WIDTH_BY_ID[def.id] || 32
  return Math.min(maxWidth, Math.max(minWidth, contentWidth + 3))
}

function resolveExcelRowHeight(values, columnWidths) {
  const lineCount = values.reduce((maxLines, value, index) => {
    const availableWidth = Math.max(1, columnWidths[index] - 2)
    const lines = String(value ?? '').split(/\r?\n/)
    const wrappedLines = lines.reduce(
      (total, line) => total + Math.max(1, Math.ceil(getExcelDisplayWidth(line) / availableWidth)),
      0
    )
    return Math.max(maxLines, wrappedLines)
  }, 1)

  return Math.max(18, lineCount * 16)
}

function colToA1(colIndex1Based) {
  let n = colIndex1Based
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function applyHeaderMerges(worksheet, merges) {
  for (const { t, l, b, r } of merges) {
    const tl = `${colToA1(l)}${t}`
    const br = `${colToA1(r)}${b}`
    worksheet.mergeCells(`${tl}:${br}`)
  }
}

function styleHeaderCell(cell) {
  cell.font = { bold: true }
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  }
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function excelHorizontalAlign() {
  return 'center'
}

export function useProjectExport({
  displayTableData,
  currentProjectInfo,
  areaComparison,
  selectedComparisonGroups,
  summaryLayoutRows,
}) {
  const runExportExcel = async () => {
    if (projectHasMissingUsage(displayTableData.value)) {
      try {
        await ElMessageBox.confirm(
          '当前项目存在用途缺失的户室，导出数据可能不完整。是否仍要继续导出？',
          '导出确认',
          { type: 'warning', confirmButtonText: '继续导出', cancelButtonText: '取消' }
        )
      } catch {
        return
      }
    }

    if (!selectedComparisonGroups.value.length) {
      ElMessage.warning('请至少选择一组面积核算对比数据后再导出')
      return
    }

    const defs = resolveVisibleColumnDefs(summaryLayoutRows.value)
    if (!defs.length) {
      ElMessage.warning('请至少选择一列汇总数据后再导出')
      return
    }

    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('房产实测汇总表')

    const { rowTop, rowBot, merges } = buildExcelHeaderPlan(defs)
    worksheet.addRow(rowTop)
    worksheet.addRow(rowBot)
    applyHeaderMerges(worksheet, merges)

    worksheet.getRow(1).height = 26
    worksheet.getRow(2).height = 24
    for (let r = 1; r <= 2; r++) {
      for (let c = 1; c <= defs.length; c++) {
        styleHeaderCell(worksheet.getCell(r, c))
      }
    }

    const summaryRows = displayTableData.value.map((item, index) =>
      defs.map((col) => formatSummaryCellValue(col, item, index))
    )
    const columnWidths = defs.map((def, columnIndex) =>
      resolveExcelColumnWidth(
        def,
        summaryRows.map((values) => values[columnIndex])
      )
    )

    defs.forEach((_, index) => {
      worksheet.getColumn(index + 1).width = columnWidths[index]
    })

    summaryRows.forEach((values) => {
      const row = worksheet.addRow(values)
      row.height = resolveExcelRowHeight(values, columnWidths)
      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: excelHorizontalAlign(),
          vertical: 'middle',
          wrapText: true,
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        }
      })
    })

    const summaryLastRow = 2 + displayTableData.value.length
    const gapRows = 2
    const calcTableStartRow = summaryLastRow + gapRows + 1

    let cursorRow = calcTableStartRow
    const selectedGroups = comparisonGroupMeta.filter((group) =>
      selectedComparisonGroups.value.includes(group.key)
    )
    selectedGroups.forEach((group) => {
      worksheet.getCell(cursorRow, 1).value = `${group.title}（面积核算对比）`
      worksheet.getCell(cursorRow, 1).font = { bold: true }
      worksheet.mergeCells(`A${cursorRow}:D${cursorRow}`)
      cursorRow += 1

      const subHeader = worksheet.getRow(cursorRow)
      subHeader.values = ['维度', '合同约定面积', '计容面积', '差值']
      subHeader.eachCell((cell) => {
        cell.font = { bold: true }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      cursorRow += 1

      buildComparisonRows(areaComparison.value?.[group.key]).forEach((line) => {
        const dataRow = worksheet.getRow(cursorRow)
        dataRow.values = line
        dataRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: colNumber === 1 ? 'left' : 'right',
            vertical: 'middle',
          }
        })
        cursorRow += 1
      })

      cursorRow += 1
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    saveAs(blob, `${currentProjectInfo.name || '项目'}房产实测汇总表.xlsx`)
    ElMessage.success('Excel 导出成功')
  }

  return {
    runExportExcel,
  }
}

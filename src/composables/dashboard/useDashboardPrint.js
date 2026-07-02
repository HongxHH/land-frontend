import { formatProjectTimeForDisplay } from '@/utils/projectTimePresent'

const PRINT_FIELDS = [
  { label: '项目名称', key: 'projectName' },
  { label: '项目时间', key: 'projectTime' },
  { label: '实测报告数', key: 'surveyReportFileCount' },
  { label: '合同文件数', key: 'contractFileCount' },
  { label: '合同约定建筑面积', key: 'contractAgreedTotalBuildingArea' },
  { label: '合同约定商业面积', key: 'contractAgreedCommercialArea' },
  { label: '合同约定住宅面积', key: 'contractAgreedResidentialArea' },
  { label: '出让方', key: 'transferor' },
  { label: '受让方', key: 'transferee' }
]

const isEmpty = (value) => value === null || value === undefined || value === ''

export const useDashboardPrint = () => {
  const buildPrintData = (rows) => {
    const safeRows = Array.isArray(rows) ? rows : []
    const headers = PRINT_FIELDS.map((item) => item.label)
    const records = safeRows.map((row) =>
      PRINT_FIELDS.map((item) => {
        const value = row?.[item.key]
        if (isEmpty(value)) return '-'
        if (item.key === 'projectTime') return formatProjectTimeForDisplay(String(value))
        return String(value)
      })
    )
    return {
      headers,
      records
    }
  }

  return {
    buildPrintData
  }
}

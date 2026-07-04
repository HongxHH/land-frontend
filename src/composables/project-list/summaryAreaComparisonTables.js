/**
 * 房产实测汇总：打印/导出/弹窗预览共用的「面积核算对比」附表数据
 */

import { formatAreaDigits } from '@/composables/project-list/summaryExportColumnSchema.js'
import { SUMMARY_COMPARISON_GROUP_META } from '@/composables/project-list/summaryComparisonGroupMeta.js'

function formatComparisonArea(value) {
  return formatAreaDigits(value, '-')
}

function buildComparisonRows(tripleLine) {
  return [
    {
      label: '建筑面积',
      contractAgreedArea: formatComparisonArea(tripleLine?.totalBuilding?.contractAgreedArea),
      buildableArea: formatComparisonArea(tripleLine?.totalBuilding?.buildableArea),
      difference: formatComparisonArea(tripleLine?.totalBuilding?.difference),
    },
    {
      label: '商业面积',
      contractAgreedArea: formatComparisonArea(tripleLine?.commercial?.contractAgreedArea),
      buildableArea: formatComparisonArea(tripleLine?.commercial?.buildableArea),
      difference: formatComparisonArea(tripleLine?.commercial?.difference),
    },
    {
      label: '住宅面积',
      contractAgreedArea: formatComparisonArea(tripleLine?.residential?.contractAgreedArea),
      buildableArea: formatComparisonArea(tripleLine?.residential?.buildableArea),
      difference: formatComparisonArea(tripleLine?.residential?.difference),
    },
  ]
}

/**
 * @param {Record<string, unknown>} areaComparison
 * @param {string[]} selectedKeys 如 systemCalculated
 * @returns {Array<{ key: string, title: string, rows: ReturnType<typeof buildComparisonRows> }>}
 */
export function buildSelectedComparisonGroups(areaComparison, selectedKeys) {
  const keys = Array.isArray(selectedKeys) ? selectedKeys : []
  return SUMMARY_COMPARISON_GROUP_META.filter((meta) => keys.includes(meta.key)).map((meta) => ({
    key: meta.key,
    title: meta.printTitle || meta.title,
    rows: buildComparisonRows(areaComparison?.[meta.key]),
  }))
}

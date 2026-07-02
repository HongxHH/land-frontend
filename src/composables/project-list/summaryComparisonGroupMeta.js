/**
 * 房产实测汇总「面积核算对比」各来源统一元数据（页面 / 打印 / Excel 导出共用）
 */
export const SUMMARY_COMPARISON_GROUP_META = [
  {
    key: 'systemCalculated',
    title: '实测报告对比结果',
    printTitle: '实测报告对比结果',
    availableField: 'systemCalculatedAvailable'
  },
  {
    key: 'projectPartyDeclared',
    title: '项目方比对结果',
    printTitle: '项目方统计比对结果',
    availableField: 'projectPartyDeclaredAvailable'
  },
  {
    key: 'planningCalculated',
    title: '规划复核对比结果',
    printTitle: '规划复核对比结果',
    availableField: 'planningCalculatedAvailable'
  },
  {
    key: 'capacityIndicatorCalculated',
    title: '容量指标核查对比结果',
    printTitle: '容量指标核查对比结果',
    availableField: 'capacityIndicatorCalculatedAvailable'
  }
]

export const SUMMARY_COMPARISON_GROUP_KEYS = SUMMARY_COMPARISON_GROUP_META.map((item) => item.key)

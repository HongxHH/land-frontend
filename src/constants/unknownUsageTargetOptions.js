/** 未知用途「归入」下拉选项，汇总表与审核页共用 */
export const UNKNOWN_USAGE_TARGET_SELECT_GROUPS = [
  {
    label: '计容建筑面积',
    options: [
      { label: '商业(办公)', value: 'calcCommercial' },
      { label: '住宅', value: 'calcResidential' },
      { label: '物管用房', value: 'calcPropMgmt' },
      { label: '其他计容', value: 'calcOther' }
    ]
  },
  {
    label: '不计容建筑面积',
    options: [
      { label: '社区用房', value: 'nonCalcCommunity' },
      { label: '其他公用', value: 'nonCalcOther' }
    ]
  }
]

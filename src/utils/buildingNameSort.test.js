import { describe, expect, it } from 'vitest'
import { sortSurveySummaryRows } from '@/utils/buildingNameSort.js'

const GARDEN = '岳麓区东方红中路60号爱家当代花园'

function orderedNames(names) {
  return sortSurveySummaryRows(
    names.map((projectName, index) => ({ projectName, id: index + 1 }))
  ).map((row) => row.projectName)
}

describe('sortSurveySummaryRows', () => {
  it('按楼栋自然序排列，配套和空名称放在后面', () => {
    expect(
      orderedNames([
        `${GARDEN}10栋`,
        `${GARDEN}2栋`,
        `${GARDEN}1栋`,
        `${GARDEN}3栋-1`,
        `${GARDEN}3栋`,
        `${GARDEN}S5-1栋`,
        `${GARDEN}S1栋`,
        `${GARDEN}S5栋`,
        `${GARDEN}南区地下室`,
        `${GARDEN}幼儿园`,
        `${GARDEN}门楼`,
        `${GARDEN}垃圾站`,
        '',
        '未知楼栋',
      ])
    ).toEqual([
      `${GARDEN}1栋`,
      `${GARDEN}2栋`,
      `${GARDEN}3栋`,
      `${GARDEN}3栋-1`,
      `${GARDEN}10栋`,
      `${GARDEN}S1栋`,
      `${GARDEN}S5栋`,
      `${GARDEN}S5-1栋`,
      `${GARDEN}南区地下室`,
      `${GARDEN}垃圾站`,
      `${GARDEN}门楼`,
      `${GARDEN}幼儿园`,
      '',
      '未知楼栋',
    ])
  })

  it('识别号楼、井号、中文数字和商业后缀', () => {
    expect(
      orderedNames([
        '十二号楼',
        '二栋',
        '十栋',
        '一栋',
        '南麓苑S1栋商业',
        '南麓苑S3栋商业',
        '一期一1#地下室',
        '10#',
        '2#',
      ])
    ).toEqual([
      '一栋',
      '二栋',
      '2#',
      '十栋',
      '10#',
      '十二号楼',
      '南麓苑S1栋商业',
      '南麓苑S3栋商业',
      '一期一1#地下室',
    ])
  })

  it('不改原数组，同名按记录 id 稳定排序', () => {
    const rows = [
      { projectName: `${GARDEN}1栋`, id: 20 },
      { projectName: `${GARDEN}1栋`, id: 3 },
      { projectName: `${GARDEN}2栋`, id: 1 },
    ]
    const snapshot = rows.map((row) => row.id)
    expect(sortSurveySummaryRows(rows).map((row) => row.id)).toEqual([3, 20, 1])
    expect(rows.map((row) => row.id)).toEqual(snapshot)
  })
})

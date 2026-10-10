/**
 * 房产实测汇总按工程名称（房屋坐落）排序。
 * 只生成比较键，不改写展示原文。
 */

const EMPTY_NAMES = new Set(['', '-', '未知楼栋'])

const CN_DIGIT = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

const LETTER_BUILDING = /([A-Za-z]+)(\d+)(?:-(\d+))?\s*栋/g
const NUMERIC_BUILDING = /(\d+)\s*(?:栋|幢|号楼|#)(?:\s*-\s*(\d+))?/g
const CN_BUILDING = /([零一二三四五六七八九十]+)\s*(?:栋|幢|号楼|#)(?:\s*-\s*(\d+))?/g

function normalizeForMatch(name) {
  return String(name ?? '')
    .trim()
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/＃/g, '#')
}

function parseChineseNumber(raw) {
  const text = String(raw || '')
  if (!text) return null
  if (text === '十') return 10
  const tenAt = text.indexOf('十')
  if (tenAt === -1) {
    return text.length === 1 && CN_DIGIT[text] != null ? CN_DIGIT[text] : null
  }
  const tens = tenAt === 0 ? 1 : CN_DIGIT[text.slice(0, tenAt)]
  const onesText = text.slice(tenAt + 1)
  const ones = onesText === '' ? 0 : CN_DIGIT[onesText]
  if (tens == null || ones == null || onesText.length > 1) return null
  return tens * 10 + ones
}

function collectMatches(text, regex, toToken) {
  const found = []
  for (const match of text.matchAll(regex)) {
    const token = toToken(match)
    if (!token) continue
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      ...token,
    })
  }
  return found
}

function overlaps(left, right) {
  return left.start < right.end && right.start < left.end
}

function buildingSortKey(name) {
  const original = String(name ?? '').trim()
  const text = normalizeForMatch(original)
  if (EMPTY_NAMES.has(text)) {
    return { rank: 9, letter: '', major: 0, minor: 0, tail: original }
  }
  if (text.includes('地下室')) {
    return { rank: 2, letter: '', major: 0, minor: 0, tail: original }
  }

  const letters = collectMatches(text, LETTER_BUILDING, (match) => ({
    rank: 1,
    letter: match[1].toUpperCase(),
    major: Number(match[2]),
    minor: Number(match[3] || 0),
    tail: '',
  }))
  const numbers = collectMatches(text, NUMERIC_BUILDING, (match) => {
    const token = {
      start: match.index,
      end: match.index + match[0].length,
    }
    if (letters.some((letter) => overlaps(letter, token))) return null
    return {
      rank: 0,
      letter: '',
      major: Number(match[1]),
      minor: Number(match[2] || 0),
      tail: '',
    }
  })
  const chinese = collectMatches(text, CN_BUILDING, (match) => {
    const major = parseChineseNumber(match[1])
    if (major == null) return null
    const token = {
      start: match.index,
      end: match.index + match[0].length,
    }
    if (letters.some((letter) => overlaps(letter, token))) return null
    if (numbers.some((number) => overlaps(number, token))) return null
    return { rank: 0, letter: '', major, minor: Number(match[2] || 0), tail: '' }
  })

  const tokens = [...letters, ...numbers, ...chinese]
  if (!tokens.length) {
    return { rank: 3, letter: '', major: 0, minor: 0, tail: original }
  }
  tokens.sort((left, right) => left.start - right.start)
  const last = tokens[tokens.length - 1]
  return {
    rank: last.rank,
    letter: last.letter,
    major: last.major,
    minor: last.minor,
    tail: '',
  }
}

function compareKeys(left, right) {
  if (left.rank !== right.rank) return left.rank - right.rank
  if (left.letter !== right.letter) return left.letter < right.letter ? -1 : 1
  if (left.major !== right.major) return left.major - right.major
  if (left.minor !== right.minor) return left.minor - right.minor
  return left.tail.localeCompare(right.tail, 'zh-CN')
}

function compareRowId(left, right) {
  const leftId = left?.id
  const rightId = right?.id
  const leftNum = Number(leftId)
  const rightNum = Number(rightId)
  if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) return leftNum - rightNum
  return String(leftId ?? '').localeCompare(String(rightId ?? ''))
}

export function sortSurveySummaryRows(rows) {
  if (!Array.isArray(rows)) return []
  if (rows.length < 2) return rows
  return [...rows].sort((left, right) => {
    const byName = compareKeys(
      buildingSortKey(left?.projectName),
      buildingSortKey(right?.projectName)
    )
    if (byName !== 0) return byName
    return compareRowId(left, right)
  })
}

export const ROOM_AREA_FIELDS = ['buildingArea', 'innerArea', 'balconyArea', 'sharedArea']

export const ROOM_AREA_MAX_DECIMALS = 5

const ROOM_AREA_FIELD_LABELS = {
  buildingArea: '建筑面积',
  innerArea: '套内面积',
  balconyArea: '阳台面积',
  sharedArea: '分摊面积',
}

export function normalizeRoomField(value) {
  const text = String(value ?? '').trim()
  return text === '-' ? '' : text
}

/** 保留接口原始精度，不做 toFixed 截断 */
export function formatRoomAreaFromApi(value) {
  if (value === null || value === undefined || value === '') return ''
  return String(value).trim()
}

/** 表格展示：空值显示 "-"，否则按原始字符串展示 */
export function formatRoomAreaDisplay(value) {
  const text = formatRoomAreaFromApi(value)
  return text === '' ? '-' : text
}

/** 仅保留数字与单个小数点，过滤负号/字母/科学计数法等 */
export function sanitizeRoomAreaInputText(text) {
  let sanitized = String(text ?? '').replace(/[^\d.]/g, '')
  const firstDot = sanitized.indexOf('.')
  if (firstDot !== -1) {
    sanitized =
      sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, '')
  }
  return sanitized
}

export function isValidRoomAreaValue(value) {
  return getRoomAreaNumericError('buildingArea', value) == null
}

export function getRoomAreaNumericError(field, value) {
  if (value === '' || value === null || value === undefined) return null
  const text = String(value).trim()
  if (text === '') return null
  const label = ROOM_AREA_FIELD_LABELS[field] || '面积'
  const num = Number(text)
  if (Number.isNaN(num)) return `${label}请输入有效数字`
  if (num < 0) return `${label}不能为负数`
  return null
}

export function hasValidRoomAreaDecimalPlaces(
  value,
  maxDecimals = ROOM_AREA_MAX_DECIMALS
) {
  if (value === '' || value === null || value === undefined) return true
  const text = String(value).trim()
  const dotIndex = text.indexOf('.')
  if (dotIndex === -1) return true
  return text.length - dotIndex - 1 <= maxDecimals
}

export function getRoomAreaFieldError(field, value, maxDecimals = ROOM_AREA_MAX_DECIMALS) {
  const numericError = getRoomAreaNumericError(field, value)
  if (numericError) return numericError
  if (!hasValidRoomAreaDecimalPlaces(value, maxDecimals)) {
    const label = ROOM_AREA_FIELD_LABELS[field] || '面积'
    return `${label}最多保留${maxDecimals}位小数`
  }
  return null
}

/** 提交前将面积归一化到最多 maxDecimals 位（四舍五入，去掉尾随零） */
export function normalizeRoomAreaForCommit(
  value,
  maxDecimals = ROOM_AREA_MAX_DECIMALS
) {
  if (value === '' || value === null || value === undefined) return ''
  const original = String(value).trim()
  if (original === '') return ''
  if (getRoomAreaNumericError('buildingArea', original)) return null
  const text = sanitizeRoomAreaInputText(original)
  if (text === '' || text === '.') return null
  const num = Number(text)
  if (Number.isNaN(num) || num < 0) return null
  const fixed = num.toFixed(maxDecimals)
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/** 输入时限制小数位数，允许输入过程中的 "12." */
export function clampRoomAreaInput(value, maxDecimals = ROOM_AREA_MAX_DECIMALS) {
  if (value === '' || value === null || value === undefined) return ''
  const text = sanitizeRoomAreaInputText(String(value).trim())
  if (text === '') return ''
  if (text === '.') return '0.'
  const dotIndex = text.indexOf('.')
  if (dotIndex === -1) return text
  const intPart = text.slice(0, dotIndex)
  const decPart = text.slice(dotIndex + 1).slice(0, maxDecimals)
  return decPart.length ? `${intPart}.${decPart}` : `${intPart}.`
}

export function getChangedRoomAreaFields(currentRow, snapshot) {
  if (!currentRow || !snapshot) return []
  return ROOM_AREA_FIELDS.filter((field) => currentRow[field] !== snapshot[field])
}

export function validateRoomAreaFields(
  data,
  { fields = ROOM_AREA_FIELDS, maxDecimals = ROOM_AREA_MAX_DECIMALS } = {}
) {
  for (const field of fields) {
    const error = getRoomAreaFieldError(field, data?.[field], maxDecimals)
    if (error) return { ok: false, message: error }
  }
  return { ok: true }
}

export function validateChangedRoomAreaFields(
  currentRow,
  snapshot,
  { maxDecimals = ROOM_AREA_MAX_DECIMALS } = {}
) {
  const fields = getChangedRoomAreaFields(currentRow, snapshot)
  if (!fields.length) return { ok: true }
  return validateRoomAreaFields(currentRow, { fields, maxDecimals })
}

function buildRoomIdentityKey(roomLevel, roomNumber) {
  return `${normalizeRoomField(roomLevel)}|${normalizeRoomField(roomNumber)}`
}

function validateRoomIdentity(roomLevel, roomNumber) {
  const level = normalizeRoomField(roomLevel)
  const number = normalizeRoomField(roomNumber)
  if (!level) {
    return { ok: false, message: '请填写楼层' }
  }
  if (!number) {
    return { ok: false, message: '请填写房号' }
  }
  return { ok: true }
}

function findDuplicateRoom(existingRows, roomLevel, roomNumber, excludeRoomId = null) {
  const targetKey = buildRoomIdentityKey(roomLevel, roomNumber)
  for (const row of existingRows || []) {
    if (excludeRoomId != null && String(row.id) === String(excludeRoomId)) {
      continue
    }
    if (buildRoomIdentityKey(row.roomLevel, row.roomNumber) === targetKey) {
      return row
    }
  }
  return null
}

function validateRoomForSave(form, existingRows, excludeRoomId = null) {
  const areaValidation = validateRoomAreaFields(form)
  if (!areaValidation.ok) return areaValidation

  const identity = validateRoomIdentity(form.roomLevel, form.roomNumber)
  if (!identity.ok) return identity

  const duplicate = findDuplicateRoom(
    existingRows,
    form.roomLevel,
    form.roomNumber,
    excludeRoomId
  )
  if (duplicate) {
    const level = normalizeRoomField(form.roomLevel)
    const number = normalizeRoomField(form.roomNumber)
    return { ok: false, message: `已存在相同楼层+房号的户室：${level} / ${number}` }
  }
  return { ok: true }
}

export function validateRoomForCreate(form, existingRows) {
  return validateRoomForSave(form, existingRows)
}

export function validateRoomForUpdate(row, existingRows) {
  return validateRoomForSave(row, existingRows, row?.id)
}

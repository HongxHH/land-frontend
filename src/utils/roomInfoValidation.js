export const ROOM_AREA_TOLERANCE = 0.01

export function normalizeRoomField(value) {
  const text = String(value ?? '').trim()
  return text === '-' ? '' : text
}

export function buildRoomIdentityKey(roomLevel, roomNumber) {
  return `${normalizeRoomField(roomLevel)}|${normalizeRoomField(roomNumber)}`
}

export function validateRoomIdentity(roomLevel, roomNumber) {
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

export function validateRoomAreaBalance(
  buildingArea,
  innerArea,
  balconyArea,
  sharedArea,
  tolerance = ROOM_AREA_TOLERANCE
) {
  const building = Number(buildingArea || 0)
  const inner = Number(innerArea || 0)
  const balcony = Number(balconyArea || 0)
  const shared = Number(sharedArea || 0)
  const sum = inner + balcony + shared
  if (Math.abs(building - sum) > tolerance) {
    return {
      ok: false,
      message: `建筑面积(${building.toFixed(2)})必须等于套内面积(${inner.toFixed(2)})+阳台面积(${balcony.toFixed(2)})+分摊面积(${shared.toFixed(2)})=${sum.toFixed(2)}`,
    }
  }
  return { ok: true }
}

export function findDuplicateRoom(existingRows, roomLevel, roomNumber, excludeRoomId = null) {
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
  const identity = validateRoomIdentity(form.roomLevel, form.roomNumber)
  if (!identity.ok) return identity

  const area = validateRoomAreaBalance(
    form.buildingArea,
    form.innerArea,
    form.balconyArea,
    form.sharedArea
  )
  if (!area.ok) return area

  const duplicate = findDuplicateRoom(existingRows, form.roomLevel, form.roomNumber, excludeRoomId)
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

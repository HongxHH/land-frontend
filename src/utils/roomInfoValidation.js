export function normalizeRoomField(value) {
  const text = String(value ?? '').trim()
  return text === '-' ? '' : text
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

export function validateRoomForCreate(form, existingRows) {
  const identity = validateRoomIdentity(form.roomLevel, form.roomNumber)
  if (!identity.ok) return identity

  const duplicate = findDuplicateRoom(existingRows, form.roomLevel, form.roomNumber)
  if (duplicate) {
    const level = normalizeRoomField(form.roomLevel)
    const number = normalizeRoomField(form.roomNumber)
    return { ok: false, message: `已存在相同楼层+房号的户室：${level} / ${number}` }
  }
  return { ok: true }
}

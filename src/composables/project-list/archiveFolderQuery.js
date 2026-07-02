/** 归档文件查询结果归一化 */

export function getArchiveFileRecordId(row) {
  return row?.id || row?.rawId || row?.fileRecordId || null
}

export function normalizeArchiveQueryResult(payload) {
  if (Array.isArray(payload)) {
    return { records: payload, total: payload.length }
  }
  const records = Array.isArray(payload?.records)
    ? payload.records
    : Array.isArray(payload?.list)
      ? payload.list
      : Array.isArray(payload?.rows)
        ? payload.rows
        : []
  return { records, total: Number(payload?.total ?? records.length) }
}

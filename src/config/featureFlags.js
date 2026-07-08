/**
 * 前端功能开关。
 *
 * 规划复核表：客户未确认前默认关闭。
 * 开发联调可在 `.env.local` 设置 `VITE_FEATURE_PLANNING_REVIEW=true`。
 */
export function isPlanningReviewEnabled() {
  return import.meta.env.VITE_FEATURE_PLANNING_REVIEW === 'true'
}

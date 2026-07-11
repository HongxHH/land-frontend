/**
 * 前端功能开关。
 *
 * 规划复核表产品页（项目 Tab、汇总对比组）默认关闭；客户确认后可在
 * `.env.local` / 构建环境设置 `VITE_FEATURE_PLANNING_REVIEW=true`。
 *
 * 关闭时仍保留：归档夹可见、归档内手动上传/解析/审核。
 * 关闭时仍隐藏：产品 Tab、汇总对比、新建项目智能导入对规划复核的自动归类。
 */
export function isPlanningReviewEnabled() {
  return import.meta.env.VITE_FEATURE_PLANNING_REVIEW === 'true'
}

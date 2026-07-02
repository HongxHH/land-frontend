import { defineAsyncComponent } from 'vue'

let cssLoaded = false

function ensureVueOfficeExcelCss() {
  if (cssLoaded) return
  cssLoaded = true
  void import('@vue-office/excel/lib/index.css')
}

/** 打开 Excel 预览/审核时再加载 @vue-office/excel */
export const VueOfficeExcelAsync = defineAsyncComponent({
  loader: async () => {
    ensureVueOfficeExcelCss()
    const mod = await import('@vue-office/excel')
    return mod.default
  },
  delay: 80,
  timeout: 60000
})

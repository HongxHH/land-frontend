/**
 * 子组件通过 emit 更新父级 form 对象字段，避免直接突变 prop。
 * @param {Record<string, unknown>} current
 * @param {string} key
 * @param {unknown} value
 */
export function patchFormObject(current, key, value) {
  return { ...(current || {}), [key]: value }
}

/**
 * @param {import('vue').SetupContext['emit']} emit
 * @param {string} propName
 */
export function createFormFieldPatcher(props, emit, propName = 'form') {
  return (key, value) => {
    emit(`update:${propName}`, patchFormObject(props[propName], key, value))
  }
}

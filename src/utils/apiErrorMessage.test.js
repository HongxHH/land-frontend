import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './apiErrorMessage.js'

describe('getApiErrorMessage', () => {
  it('returns trimmed msg from response.data.msg when present', () => {
    const err = { response: { data: { msg: '  rate limited  ' } } }
    expect(getApiErrorMessage(err, 'fallback')).toBe('rate limited')
  })

  it('returns fallback when msg missing or blank', () => {
    expect(getApiErrorMessage({}, 'x')).toBe('x')
    expect(getApiErrorMessage({ response: { data: {} } }, 'x')).toBe('x')
    expect(getApiErrorMessage({ response: { data: { msg: '   ' } } }, 'x')).toBe('x')
  })
})

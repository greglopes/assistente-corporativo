import { describe, expect, it } from 'vitest'
import { ValidationError, validateInput } from '../server/utils/validate'
import { checkRateLimit } from '../server/utils/rateLimit'

const ok = {
  objective: 'Avisar', audience: 'Equipe interna', channel: 'email', tone: 'Formal', content: 'Informações',
}

describe('validação da entrada', () => {
  it('aceita uma solicitação válida', () => {
    expect(validateInput(ok)).toMatchObject(ok)
  })

  it.each([
    [{ ...ok, channel: 'fax' }, 'Canal inválido'],
    [{ ...ok, audience: 'Marcianos' }, 'Público inválido'],
    [{ ...ok, content: '' }, 'Informações principais'],
    [{ ...ok, content: 'x'.repeat(6001) }, 'limite'],
    [null, 'inválida'],
  ])('rejeita entrada inválida (%#)', (body, msg) => {
    expect(() => validateInput(body)).toThrow(ValidationError)
    expect(() => validateInput(body)).toThrow(msg)
  })
})

describe('limite de uso', () => {
  it('bloqueia após o máximo e libera depois da janela', () => {
    const key = `t-${Math.random()}`
    expect(checkRateLimit(key, 2, 1000, 0).ok).toBe(true)
    expect(checkRateLimit(key, 2, 1000, 10).ok).toBe(true)
    expect(checkRateLimit(key, 2, 1000, 20).ok).toBe(false)
    expect(checkRateLimit(key, 2, 1000, 1001).ok).toBe(true)
  })
})

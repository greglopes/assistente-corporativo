import { describe, expect, it } from 'vitest'
import { createMasker, unmask } from '../server/utils/pii'

describe('filtro de privacidade', () => {
  it('mascara e restaura dados pessoais brasileiros', () => {
    const m = createMasker()
    const original = 'Fale com ana@empresa.com.br ou (11) 98765-4321. CPF 123.456.789-09, CNPJ 12.345.678/0001-90, cartão 4111 1111 1111 1111.'
    const masked = m.mask(original)

    expect(masked).not.toContain('ana@empresa.com.br')
    expect(masked).not.toContain('98765-4321')
    expect(masked).not.toContain('123.456.789-09')
    expect(masked).not.toContain('12.345.678/0001-90')
    expect(masked).not.toContain('4111 1111')
    expect(masked).toContain('[EMAIL_1]')
    expect(masked).toContain('[TELEFONE_1]')
    expect(masked).toContain('[CPF_1]')
    expect(masked).toContain('[CNPJ_1]')
    expect(masked).toContain('[CARTAO_1]')

    expect(unmask(masked, m.map)).toBe(original)
  })

  it('usa o mesmo marcador para o mesmo dado em textos diferentes', () => {
    const m = createMasker()
    const a = m.mask('enviar para joao@x.com')
    const b = m.mask('cópia para joao@x.com e maria@x.com')
    expect(a).toBe('enviar para [EMAIL_1]')
    expect(b).toBe('cópia para [EMAIL_1] e [EMAIL_2]')
    expect(m.findings()).toEqual([{ type: 'e-mail', count: 2 }])
  })

  it('não altera texto sem dados pessoais (datas, pedidos, horários)', () => {
    const m = createMasker()
    const text = 'Pedido 48213 entregue em 05/12/2026 às 14h, ramal 2040.'
    expect(m.mask(text)).toBe(text)
    expect(m.findings()).toEqual([])
  })
})

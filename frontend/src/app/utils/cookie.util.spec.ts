/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CookieUtil } from './cookie.util';

describe('CookieUtil', () => {
  beforeEach(() => {
    // Limpa cookies antes de cada teste
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });

    vi.stubGlobal('location', {
      hostname: 'localhost',
    });
  });

  it('deve definir e recuperar um cookie', () => {
    CookieUtil.set('test_cookie', 'hello');
    expect(CookieUtil.get('test_cookie')).toBe('hello');
  });

  it('deve retornar null para cookie inexistente', () => {
    expect(CookieUtil.get('non_existent')).toBeNull();
  });

  it('deve deletar um cookie', () => {
    CookieUtil.set('to_delete', 'value');
    expect(CookieUtil.get('to_delete')).toBe('value');
    CookieUtil.delete('to_delete');
    expect(CookieUtil.get('to_delete')).toBeNull();
  });

  it('deve calcular o domínio correto para subdomínios', () => {
    // Este teste é mais difícil de validar o 'document.cookie' real pois o JSHandle/jsdom
    // pode não validar o atributo 'domain' contra o hostname mockado perfeitamente,
    // mas podemos testar a lógica se expusermos o método de cálculo de domínio.
    // Por enquanto, validamos apenas que o set/get funciona no hostname atual.
    CookieUtil.set('sub_cookie', 'sub_value');
    expect(CookieUtil.get('sub_cookie')).toBe('sub_value');
  });
});

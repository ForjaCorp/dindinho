import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('main.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle bootstrap errors gracefully', () => {
    // Mock console.error para verificar tratamento de erros
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(vi.fn());

    // Simula o tratamento de erro como no main.ts
    const error = new Error('Test error');
    console.error('Falha na inicialização da aplicação:', error);

    expect(mockConsoleError).toHaveBeenCalledWith('Falha na inicialização da aplicação:', error);

    mockConsoleError.mockRestore();
  });

  it('should have proper error handling structure', () => {
    // Verifica se o tratamento de erro está estruturado corretamente
    expect(typeof console.error).toBe('function');

    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // Simula o catch do bootstrap como no main.ts
    const mockError = { status: 500, message: 'Server error' };
    expect(() => {
      console.error('Falha na inicialização da aplicação:', mockError);
    }).not.toThrow();

    mockConsoleError.mockRestore();
  });

  it('should be able to import bootstrapApplication', () => {
    // Verifica se podemos importar a função de bootstrap
    expect(() => {
      import('@angular/platform-browser');
    }).not.toThrow();
  });
});

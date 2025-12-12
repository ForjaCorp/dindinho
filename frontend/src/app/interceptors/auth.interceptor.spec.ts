import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpHandlerFn, HttpRequest, HttpResponse, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';

/**
 * Testes para o interceptor de autenticação.
 * Verifica o comportamento do interceptor ao adicionar tokens JWT às requisições HTTP.
 */
describe('authInterceptor', () => {
  /**
   * Requisição HTTP mock para uso nos testes.
   */
  let mockReq: HttpRequest<unknown>;

  /**
   * Função mock next que simula o próximo handler na cadeia de interceptors.
   */
  let mockNext: HttpHandlerFn;

  /**
   * Array que captura as requisições passadas para a função next.
   */
  let capturedRequests: HttpRequest<unknown>[];

  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();

    // Criar requisição mock
    mockReq = new HttpRequest('GET', '/api/test');

    // Criar função mock next que retorna Observable<HttpEvent>
    capturedRequests = [];
    mockNext = ((req: HttpRequest<unknown>) => {
      capturedRequests.push(req);
      return of(new HttpResponse({ status: 200, body: {} }));
    }) as HttpHandlerFn;
  });

  /**
   * Limpeza após cada teste.
   * Limpa o localStorage e restaura os mocks.
   */
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  /**
   * Verifica se o interceptor está definido e é uma função.
   */
  it('deve estar definido', () => {
    expect(authInterceptor).toBeDefined();
    expect(typeof authInterceptor).toBe('function');
  });

  /**
   * Testa o comportamento quando existe token no localStorage.
   */
  describe('quando token existe no localStorage', () => {
    /**
     * Configura um token mock no localStorage antes dos testes.
     */
    beforeEach(() => {
      localStorage.setItem('dindinho_token', 'test-jwt-token');
    });

    /**
     * Verifica se o header Authorization é adicionado corretamente.
     */
    it('deve adicionar header Authorization à requisição', () => {
      authInterceptor(mockReq, mockNext);

      expect(capturedRequests).toHaveLength(1);

      const interceptedRequest = capturedRequests[0];
      expect(interceptedRequest.headers.get('Authorization')).toBe('Bearer test-jwt-token');
    });

    /**
     * Verifica se a requisição é clonada com o token Bearer.
     */
    it('deve clonar requisição com Bearer token', () => {
      authInterceptor(mockReq, mockNext);

      const interceptedRequest = capturedRequests[0];
      expect(interceptedRequest).not.toBe(mockReq); // Deve ser uma requisição clonada
      expect(interceptedRequest.method).toBe(mockReq.method);
      expect(interceptedRequest.url).toBe(mockReq.url);
    });

    /**
     * Verifica se headers existentes são preservados ao adicionar o Authorization.
     */
    it('deve preservar headers existentes da requisição', () => {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
      });
      const reqWithHeaders = new HttpRequest('GET', '/api/test', null, {
        headers: headers,
      });

      authInterceptor(reqWithHeaders, mockNext);

      const interceptedRequest = capturedRequests[0];
      expect(interceptedRequest.headers.get('Content-Type')).toBe('application/json');
      expect(interceptedRequest.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(interceptedRequest.headers.get('Authorization')).toBe('Bearer test-jwt-token');
    });

    /**
     * Verifica se o interceptor funciona com diferentes métodos HTTP.
     */
    it('deve funcionar com diferentes métodos HTTP', () => {
      const postReq = new HttpRequest('POST', '/api/data', { test: 'data' });

      authInterceptor(postReq, mockNext);

      const interceptedRequest = capturedRequests[0];
      expect(interceptedRequest.method).toBe('POST');
      expect(interceptedRequest.headers.get('Authorization')).toBe('Bearer test-jwt-token');
    });
  });

  /**
   * Testa o comportamento quando não existe token no localStorage.
   */
  describe('quando não existe token no localStorage', () => {
    /**
     * Verifica se a requisição original é passada sem modificações.
     */
    it('deve passar requisição original sem modificação', () => {
      authInterceptor(mockReq, mockNext);

      expect(capturedRequests).toHaveLength(1);
      expect(capturedRequests[0]).toBe(mockReq);
    });

    /**
     * Verifica que nenhum header Authorization é adicionado sem token.
     */
    it('não deve adicionar header Authorization', () => {
      authInterceptor(mockReq, mockNext);

      const interceptedRequest = capturedRequests[0];
      expect(interceptedRequest.headers.get('Authorization')).toBeNull();
    });

    /**
     * Verifica se a requisição é preservada quando há outra chave no localStorage.
     */
    it('deve preservar requisição quando localStorage tem chave diferente', () => {
      localStorage.setItem('different_token', 'some-token');

      authInterceptor(mockReq, mockNext);

      expect(capturedRequests[0]).toBe(mockReq);
      const interceptedRequest = capturedRequests[0];
      expect(interceptedRequest.headers.get('Authorization')).toBeNull();
    });
  });

  /**
   * Testa casos extremos de valores de token.
   */
  describe('casos extremos de token', () => {
    /**
     * Verifica o comportamento com token string vazia.
     */
    it('deve tratar token string vazia', () => {
      localStorage.setItem('dindinho_token', '');

      authInterceptor(mockReq, mockNext);

      const interceptedRequest = capturedRequests[0];
      // String vazia é falsy, então nenhum header Authorization deve ser adicionado
      expect(interceptedRequest.headers.get('Authorization')).toBeNull();
    });

    /**
     * Verifica o comportamento com token valor null.
     */
    it('deve tratar valor de token null', () => {
      localStorage.setItem('dindinho_token', 'null');

      authInterceptor(mockReq, mockNext);

      const interceptedRequest = capturedRequests[0];
      expect(interceptedRequest.headers.get('Authorization')).toBe('Bearer null');
    });

    /**
     * Verifica o comportamento com token valor undefined.
     */
    it('deve tratar valor de token undefined', () => {
      localStorage.setItem('dindinho_token', 'undefined');

      authInterceptor(mockReq, mockNext);

      const interceptedRequest = capturedRequests[0];
      expect(interceptedRequest.headers.get('Authorization')).toBe('Bearer undefined');
    });
  });

  /**
   * Testa a interação com o localStorage.
   */
  describe('interação com localStorage', () => {
    /**
     * Verifica se a chave correta do localStorage é usada.
     */
    it('deve usar chave correta do localStorage', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      authInterceptor(mockReq, mockNext);

      expect(getItemSpy).toHaveBeenCalledWith('dindinho_token');
    });

    /**
     * Verifica o tratamento de erros de acesso ao localStorage.
     */
    it('deve tratar erros de acesso ao localStorage', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      expect(() => authInterceptor(mockReq, mockNext)).toThrow('localStorage access denied');
    });
  });

  /**
   * Testa o fluxo da requisição.
   */
  describe('fluxo da requisição', () => {
    /**
     * Verifica se a função next é chamada exatamente uma vez.
     */
    it('deve chamar função next exatamente uma vez', () => {
      authInterceptor(mockReq, mockNext);
      expect(capturedRequests).toHaveLength(1);
    });

    /**
     * Verifica se o resultado da função next é retornado.
     */
    it('deve retornar resultado da função next', () => {
      const result = authInterceptor(mockReq, mockNext);
      expect(result).toBeDefined();
    });
  });

  /**
   * Garante que não enviamos tokens para domínios externos
   */
  it('NÃO deve adicionar token para URLs externas', () => {
    localStorage.setItem('dindinho_token', 'test-jwt-token');
    // Uma URL que começa com http/https é considerada absoluta/externa neste contexto
    const externalReq = new HttpRequest('GET', 'https://api.externa.com/dados');

    authInterceptor(externalReq, mockNext);

    const interceptedRequest = capturedRequests[0];
    // A lógica do interceptor precisaria verificar se a URL começa com "/" ou corresponde ao seu environment.apiUrl
    expect(interceptedRequest.headers.has('Authorization')).toBe(false);
  });
});

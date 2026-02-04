/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DocsService, type OpenApiDocument } from './docs.service';
import { environment } from '../../environments/environment';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('DocsService', () => {
  let service: DocsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DocsService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(DocsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve fazer fallback para OpenAPI empacotado quando backend falhar', async () => {
    const expected: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 'Fallback API', version: '0.0.0' },
      paths: {},
    };

    let result: OpenApiDocument | null = null;
    let receivedError: unknown = null;

    service.getOpenApi().subscribe({
      next: (doc: OpenApiDocument) => {
        result = doc;
      },
      error: (err: unknown) => {
        receivedError = err;
      },
    });

    const req1 = httpMock.expectOne('http://localhost:3333/api/docs/json');
    req1.flush('Network error', { status: 0, statusText: 'Network Error' });

    const req2 = httpMock.expectOne('/assets/docs/30-api/openapi.json');
    req2.flush(expected);

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(receivedError).toBeNull();
    expect(result).toEqual(expected);
  });

  it('deve propagar erro quando backend e fallback falharem', async () => {
    let result: OpenApiDocument | null = null;
    let receivedError: unknown = null;

    service.getOpenApi().subscribe({
      next: (doc: OpenApiDocument) => {
        result = doc;
      },
      error: (err: unknown) => {
        receivedError = err;
      },
    });

    const req1 = httpMock.expectOne('http://localhost:3333/api/docs/json');
    req1.flush('Network error', { status: 0, statusText: 'Network Error' });

    const req2 = httpMock.expectOne('/assets/docs/30-api/openapi.json');
    req2.flush('Not found', { status: 404, statusText: 'Not Found' });

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(result).toBeNull();
    expect(receivedError).toBeTruthy();
  });

  describe('getFile', () => {
    it('deve carregar um arquivo Markdown (.md)', () => {
      const content = '# Teste';
      service.getFile('intro.md').subscribe((res) => {
        expect(res).toBe(content);
      });

      const req = httpMock.expectOne('/assets/docs/intro.md');
      expect(req.request.method).toBe('GET');
      req.flush(content);
    });

    it('deve carregar um arquivo JSON (.json)', () => {
      const content = { openapi: '3.0.0' };
      service.getFile('api.json').subscribe((res) => {
        expect(res).toEqual(content);
      });

      const req = httpMock.expectOne('/assets/docs/api.json');
      expect(req.request.method).toBe('GET');
      req.flush(content);
    });

    it('deve retornar erro para caminho inválido (sem extensão permitida)', () => {
      service.getFile('invalid').subscribe({
        error: (err) => {
          expect(err.message).toBe('Caminho de docs inválido');
        },
      });
    });

    it('deve retornar erro para tentativa de path traversal (..)', () => {
      service.getFile('../secret.md').subscribe({
        error: (err) => {
          expect(err.message).toBe('Caminho de docs inválido');
        },
      });
    });
  });

  describe('getRawDocUrl', () => {
    it('deve retornar a URL correta para um arquivo válido', () => {
      expect(service.getRawDocUrl('test.md')).toBe('/assets/docs/test.md');
    });

    it('deve retornar null para caminhos inválidos', () => {
      expect(service.getRawDocUrl('')).toBeNull();
      expect(service.getRawDocUrl('../../etc/passwd')).toBeNull();
    });
  });

  describe('URLs e Helpers', () => {
    it('deve retornar a URL do Swagger UI', () => {
      expect(service.getSwaggerUiUrl()).toContain('/docs');
    });

    it('deve normalizar apiUrl com barra no final em getSwaggerUiUrl', () => {
      const originalUrl = environment.apiUrl;
      (environment as { apiUrl: string }).apiUrl = 'http://api.test/';
      expect(service.getSwaggerUiUrl()).toBe('http://api.test/docs');
      (environment as { apiUrl: string }).apiUrl = originalUrl;
    });

    it('deve retornar a URL do JSON OpenAPI', () => {
      expect(service.getOpenApiJsonUrl()).toContain('/docs/json');
    });
  });

  describe('normalizeRelativeDocPath', () => {
    it('deve retornar null para caminhos vazios ou compostos apenas por barras', () => {
      expect(service.getRawDocUrl('  ')).toBeNull();
      expect(service.getRawDocUrl('///')).toBeNull();
    });

    it('deve normalizar contra-barras para barras normais', () => {
      expect(service.getRawDocUrl('admin\\intro.md')).toBe('/assets/docs/admin/intro.md');
    });

    it('deve remover barra inicial se presente', () => {
      expect(service.getRawDocUrl('/admin/intro.md')).toBe('/assets/docs/admin/intro.md');
    });
  });
});

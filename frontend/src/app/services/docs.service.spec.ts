/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DocsService, type OpenApiDocument } from './docs.service';

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

    service.getOpenApiDoc().subscribe({
      next: (doc) => {
        result = doc;
      },
      error: (err) => {
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

    service.getOpenApiDoc().subscribe({
      next: (doc) => {
        result = doc;
      },
      error: (err) => {
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
});

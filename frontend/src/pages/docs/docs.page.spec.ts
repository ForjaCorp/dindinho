/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { DocsPage } from './docs.page';
import { DocsService, type OpenApiDocument } from '../../app/services/docs.service';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('DocsPage', () => {
  let fixture: ComponentFixture<DocsPage>;
  let component: DocsPage;
  let queryParamMap$: BehaviorSubject<ParamMap>;
  let docsServiceMock: {
    getMarkdown: ReturnType<typeof vi.fn>;
    getOpenApiDoc: ReturnType<typeof vi.fn>;
    getOpenApiJsonUrl: ReturnType<typeof vi.fn>;
    getSwaggerUiUrl: ReturnType<typeof vi.fn>;
    getRawDocUrl: ReturnType<typeof vi.fn>;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    TestBed.resetTestingModule();
    queryParamMap$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({ path: '90-backlog/planning/documentation.md' }),
    );

    docsServiceMock = {
      getMarkdown: vi.fn(() => of('# Plano de docs')),
      getOpenApiDoc: vi.fn(() =>
        of({
          openapi: '3.0.0',
          info: { title: 'API', version: '0.0.0' },
          paths: {},
        } satisfies OpenApiDocument),
      ),
      getOpenApiJsonUrl: vi.fn(() => '/api/docs/json'),
      getSwaggerUiUrl: vi.fn(() => '/api/docs'),
      getRawDocUrl: vi.fn((path: string) => `/assets/docs/${path}`),
    };

    await TestBed.configureTestingModule({
      imports: [DocsPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
        { provide: DocsService, useValue: docsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar e renderizar markdown quando path é de documento', () => {
    expect(docsServiceMock.getMarkdown).toHaveBeenCalledWith(
      '90-backlog/planning/documentation.md',
    );

    const markdownEl: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="docs-markdown"]',
    );
    expect(markdownEl).toBeTruthy();
    expect(markdownEl?.textContent ?? '').toContain('# Plano de docs');
  });

  it('deve renderizar OpenAPI quando path é __openapi__', () => {
    const openApiDoc: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 'Dindinho API', version: '1.2.3' },
      tags: [{ name: 'auth', description: 'Autenticação' }],
      paths: {
        '/auth/login': {
          post: {
            summary: 'Login',
            operationId: 'authLogin',
            tags: ['auth'],
          },
        },
      },
    };

    docsServiceMock.getOpenApiDoc.mockReturnValue(of(openApiDoc));
    queryParamMap$.next(convertToParamMap({ path: '__openapi__' }));
    fixture.detectChanges();

    const openApiEl: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="docs-openapi"]',
    );
    expect(openApiEl).toBeTruthy();

    const text = openApiEl?.textContent ?? '';
    expect(text).toContain('Dindinho API');
    expect(text).toContain('1.2.3');
    expect(text).toContain('POST /auth/login');
    expect(text).toContain('Login');
    expect(text).toContain('authLogin');
  });

  it('deve abrir o raw do markdown ao clicar em “Abrir raw”', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    if (!('createObjectURL' in URL)) {
      Object.defineProperty(URL, 'createObjectURL', {
        value: (_blob: Blob) => 'blob:docs-raw',
        writable: true,
        configurable: true,
      });
    }

    if (!('revokeObjectURL' in URL)) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: (_url: string) => undefined,
        writable: true,
        configurable: true,
      });
    }
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:docs-raw');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="docs-open-raw"]',
    );
    expect(btn).toBeTruthy();
    btn?.click();

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('blob:docs-raw', '_blank', 'noopener');
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(0);
  });

  it('deve abrir o Swagger ao clicar no botão “Swagger”', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    docsServiceMock.getSwaggerUiUrl.mockReturnValue('https://example.com/docs');

    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="docs-open-swagger"]',
    );
    expect(btn).toBeTruthy();
    btn?.click();

    expect(openSpy).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener');
  });

  it('deve abrir o raw do OpenAPI ao clicar em “Abrir raw” quando path é __openapi__', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    docsServiceMock.getOpenApiJsonUrl.mockReturnValue('https://example.com/api/docs/json');

    queryParamMap$.next(convertToParamMap({ path: '__openapi__' }));
    fixture.detectChanges();

    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="docs-open-raw"]',
    );
    expect(btn).toBeTruthy();
    btn?.click();

    expect(openSpy).toHaveBeenCalledWith('https://example.com/api/docs/json', '_blank', 'noopener');
  });

  it('não deve abrir raw quando o caminho é inválido', () => {
    docsServiceMock.getMarkdown.mockReturnValue(throwError(() => new Error('Caminho inválido')));
    docsServiceMock.getRawDocUrl.mockReturnValue(null);
    queryParamMap$.next(convertToParamMap({ path: '../segredo.md' }));
    fixture.detectChanges();

    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="docs-open-raw"]',
    );
    btn?.click();

    expect(openSpy).not.toHaveBeenCalled();
  });
});

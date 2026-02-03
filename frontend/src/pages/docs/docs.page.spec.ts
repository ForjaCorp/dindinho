/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivatedRoute, convertToParamMap, provideRouter, type ParamMap } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { DocsPage } from './docs.page';
import { DocsService, type OpenApiDocument } from '../../app/services/docs.service';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('DocsPage', () => {
  let fixture: ComponentFixture<DocsPage>;
  let component: DocsPage;
  let docsServiceMock: {
    getFile: ReturnType<typeof vi.fn>;
    getOpenApi: ReturnType<typeof vi.fn>;
    getSwaggerUiUrl: ReturnType<typeof vi.fn>;
  };
  let activatedRouteMock: {
    snapshot: {
      paramMap: ParamMap;
      queryParamMap: ParamMap;
    };
  };

  beforeEach(async () => {
    docsServiceMock = {
      getFile: vi.fn(() => of('')),
      getOpenApi: vi.fn(() =>
        of({ openapi: '3.0.0', info: { title: '', version: '' }, paths: {} }),
      ),
      getSwaggerUiUrl: vi.fn(() => 'https://api.dindinho.com/docs'),
    };

    activatedRouteMock = {
      snapshot: {
        paramMap: convertToParamMap({}),
        queryParamMap: convertToParamMap({}),
      },
    };

    await TestBed.configureTestingModule({
      imports: [DocsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: DocsService, useValue: docsServiceMock },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const createComponent = () => {
    fixture = TestBed.createComponent(DocsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('deve criar o componente', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('deve carregar markdown padrão se nenhum slug ou path for fornecido', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Documentação Padrão'));
    createComponent();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('90-backlog/planning/documentation.md');
    const markdownEl = fixture.nativeElement.querySelector('[data-testid="docs-markdown"]');
    expect(markdownEl.textContent).toContain('Documentação Padrão');
  });

  it('deve carregar documento via slug', () => {
    activatedRouteMock.snapshot.paramMap = convertToParamMap({ slug: 'reports' });
    docsServiceMock.getFile.mockReturnValue(of('# Relatórios'));
    createComponent();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('40-clients/pwa/reports-frontend.md');
  });

  it('deve carregar api-ref via slug', () => {
    activatedRouteMock.snapshot.paramMap = convertToParamMap({ slug: 'api-ref' });
    createComponent();

    expect(docsServiceMock.getOpenApi).toHaveBeenCalled();
  });

  it('deve carregar documento via query param path', () => {
    activatedRouteMock.snapshot.queryParamMap = convertToParamMap({
      path: '30-api/authentication.md',
    });
    docsServiceMock.getFile.mockReturnValue(of('# Auth'));
    createComponent();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('30-api/authentication.md');
  });

  it('deve processar frontmatter corretamente', () => {
    const content = `---
title: "Meu Título"
description: "Minha Descrição"
tags: ["tag1", "tag2"]
---
# Conteúdo`;
    docsServiceMock.getFile.mockReturnValue(of(content));
    createComponent();

    const titleEl = fixture.nativeElement.querySelector('h1');
    expect(titleEl.textContent).toContain('Meu Título');

    const descEl = fixture.nativeElement.querySelector('p');
    expect(descEl.textContent).toContain('Minha Descrição');

    const tags = fixture.nativeElement.querySelectorAll('span');
    expect(tags[0].textContent.toLowerCase()).toContain('tag1');
    expect(tags[1].textContent.toLowerCase()).toContain('tag2');
  });

  it('deve exibir UI de redirecionamento do Swagger quando o slug é swagger', () => {
    activatedRouteMock.snapshot.paramMap = convertToParamMap({ slug: 'swagger' });
    createComponent();

    const swaggerEl = fixture.nativeElement.querySelector('[data-testid="docs-swagger-redirect"]');
    expect(swaggerEl).toBeTruthy();

    const link = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('https://api.dindinho.com/docs');
  });

  it('deve renderizar OpenAPI quando o path é __openapi__', () => {
    activatedRouteMock.snapshot.paramMap = convertToParamMap({ slug: 'openapi' });
    const mockOpenApi: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 'Dindinho API', version: '1.0.0' },
      paths: {
        '/auth/login': {
          post: {
            summary: 'Realiza login',
            operationId: 'login',
            tags: ['Auth'],
          },
        },
      },
    };
    docsServiceMock.getOpenApi.mockReturnValue(of(mockOpenApi));
    createComponent();

    const openApiEl = fixture.nativeElement.querySelector('[data-testid="docs-openapi"]');
    expect(openApiEl).toBeTruthy();
    expect(openApiEl.textContent).toContain('POST');
    expect(openApiEl.textContent).toContain('/auth/login');
    expect(openApiEl.textContent).toContain('Realiza login');
  });

  it('deve exibir estado de carregamento', () => {
    docsServiceMock.getFile.mockReturnValue(new Subject<string>().asObservable()); // Nunca emite automaticamente
    fixture = TestBed.createComponent(DocsPage);
    // @ts-expect-error - Acessando sinal protegido para teste
    fixture.componentInstance.isLoading.set(true);
    fixture.detectChanges();

    const loadingEl = fixture.nativeElement.querySelector('[data-testid="docs-loading"]');
    expect(loadingEl).toBeTruthy();
  });

  it('deve exibir mensagem de erro em caso de falha', () => {
    docsServiceMock.getFile.mockReturnValue(throwError(() => new Error('Falha')));
    createComponent();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="docs-error"]');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Não foi possível carregar o documento');
  });
});

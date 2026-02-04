/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivatedRoute, provideRouter, type Params } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
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
    params: Subject<Params>;
    queryParams: Subject<Params>;
    snapshot: ActivatedRoute['snapshot'];
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
      params: new Subject<Params>(),
      queryParams: new Subject<Params>(),
      snapshot: { data: {} } as ActivatedRoute['snapshot'],
    };

    await TestBed.configureTestingModule({
      imports: [DocsPage],
      providers: [
        provideRouter([]),
        provideMarkdown(),
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

  afterEach(() => {
    fixture.destroy();
  });

  it('deve criar o componente', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('deve carregar markdown padrão se nenhum slug ou path for fornecido', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Documentação Padrão'));
    createComponent();
    activatedRouteMock.params.next({});
    activatedRouteMock.queryParams.next({});
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('00-overview/intro.md');
    const markdownEl = fixture.nativeElement.querySelector('[data-testid="docs-markdown"]');
    expect(markdownEl.textContent).toContain('Documentação Padrão');
  });

  it('deve carregar documento via slug', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Relatórios'));
    createComponent();
    activatedRouteMock.params.next({ slug: 'reports' });
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('40-clients/pwa/reports-frontend.md');
  });

  it('deve carregar documento de domínio via slug', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Domínio de Contas'));
    createComponent();
    activatedRouteMock.params.next({ slug: 'dominio-contas' });
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('10-product/dominio-contas.md');
  });

  it('deve carregar intro de admin quando context é admin', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Admin Intro'));

    // Simula data da rota no mock
    activatedRouteMock.snapshot.data = { context: 'admin' };

    createComponent();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('admin/intro.md');
  });

  it('deve carregar api-ref via slug', () => {
    createComponent();
    activatedRouteMock.params.next({ slug: 'api-ref' });
    fixture.detectChanges();

    expect(docsServiceMock.getOpenApi).toHaveBeenCalled();
  });

  it('deve carregar documento via query param path', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Auth'));
    createComponent();
    activatedRouteMock.queryParams.next({ path: '30-api/authentication.md' });
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('30-api/authentication.md');
  });

  it('deve processar frontmatter corretamente', async () => {
    const md = `---\ntitle: "Meu Título"\ndescription: "Minha Descrição"\ntags: ["test", "frontmatter"]\n---\n# Meu Título Interno\nConteúdo`;
    docsServiceMock.getFile.mockReturnValue(of(md));
    createComponent();
    activatedRouteMock.params.next({ slug: 'principles' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Título externo (h1 fora do markdown) não deve existir
    const externalTitleEl = fixture.nativeElement.querySelector('.mb-8 h1');
    expect(externalTitleEl).toBeNull();

    // Mas o conteúdo deve estar presente no markdown renderer (que terá seu próprio h1)
    const markdownEl = fixture.nativeElement.querySelector('[data-testid="docs-markdown"]');
    expect(markdownEl.textContent).toContain('Meu Título Interno');
  });

  it('deve exibir UI de redirecionamento do Swagger quando o slug é swagger', () => {
    createComponent();
    activatedRouteMock.params.next({ slug: 'swagger' });
    fixture.detectChanges();

    const swaggerEl = fixture.nativeElement.querySelector('[data-testid="docs-swagger-redirect"]');
    expect(swaggerEl).toBeTruthy();

    const link = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('https://api.dindinho.com/docs');
  });

  it('deve renderizar OpenAPI quando o path é __openapi__', () => {
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
    activatedRouteMock.params.next({ slug: 'openapi' });
    fixture.detectChanges();

    const openApiEl = fixture.nativeElement.querySelector('[data-testid="docs-openapi"]');
    expect(openApiEl).toBeTruthy();
    expect(openApiEl.getAttribute('role')).toBe('article');
    expect(openApiEl.getAttribute('aria-label')).toBe('Referência da API');

    const sections = openApiEl.querySelectorAll('section');
    expect(sections.length).toBe(1);
    expect(sections[0].getAttribute('aria-labelledby')).toContain('group-Auth');

    const list = openApiEl.querySelector('[role="list"]');
    expect(list).toBeTruthy();

    const listItem = openApiEl.querySelector('[role="listitem"]');
    expect(listItem).toBeTruthy();

    expect(openApiEl.textContent).toContain('POST');
    expect(openApiEl.textContent).toContain('/auth/login');
    expect(openApiEl.textContent).toContain('Realiza login');
  });

  it('deve exibir estado de carregamento com skeleton e aria-busy', () => {
    docsServiceMock.getFile.mockReturnValue(new Subject<string>().asObservable()); // Nunca emite automaticamente
    fixture = TestBed.createComponent(DocsPage);
    fixture.detectChanges();
    activatedRouteMock.params.next({});
    fixture.detectChanges();

    const loadingEl = fixture.nativeElement.querySelector('[data-testid="docs-loading"]');
    expect(loadingEl).toBeTruthy();
    expect(loadingEl.getAttribute('aria-busy')).toBe('true');
    expect(loadingEl.getAttribute('aria-label')).toBe('Carregando conteúdo');

    // Verifica se os containers principais têm aria-busy
    const busyContainers = fixture.nativeElement.querySelectorAll('[aria-busy="true"]');
    expect(busyContainers.length).toBeGreaterThan(1);
  });

  it('deve ter atributos de acessibilidade no conteúdo markdown', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Teste'));
    createComponent();
    activatedRouteMock.params.next({});
    fixture.detectChanges();

    const markdownEl = fixture.nativeElement.querySelector('[data-testid="docs-markdown"]');
    expect(markdownEl.tagName.toLowerCase()).toBe('article');
    expect(markdownEl.getAttribute('aria-label')).toBe('Conteúdo do documento');
  });

  it('deve exibir mensagem de erro em caso de falha e resetar metadados', async () => {
    // Primeiro carrega algo com sucesso
    docsServiceMock.getOpenApi.mockReturnValue(
      of({ openapi: '3.0.0', info: { title: 'API Sucesso', version: '1.0' }, paths: {} }),
    );
    createComponent();
    activatedRouteMock.params.next({ slug: 'api-ref' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Verifica se preencheu o título externo (OpenAPI usa título externo)
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('API Reference');

    // Agora simula erro no próximo carregamento
    docsServiceMock.getFile.mockReturnValue(throwError(() => new Error('Falha')));
    activatedRouteMock.params.next({ slug: 'principles' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="docs-error"]');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Erro ao carregar documento');

    // Título externo deve mudar para Erro
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Erro de Carregamento');
  });

  it('deve reagir a mudanças sucessivas nos parâmetros', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Primeiro'));
    createComponent();

    // Primeiro acesso
    activatedRouteMock.params.next({ slug: 'reports' });
    fixture.detectChanges();
    expect(docsServiceMock.getFile).toHaveBeenCalledWith('40-clients/pwa/reports-frontend.md');

    // Segundo acesso (mudança de rota)
    docsServiceMock.getFile.mockReturnValue(of('# Segundo'));
    activatedRouteMock.params.next({ slug: 'dominio-contas' });
    fixture.detectChanges();
    expect(docsServiceMock.getFile).toHaveBeenCalledWith('10-product/dominio-contas.md');
  });

  it('deve lidar com falha no carregamento do OpenAPI', async () => {
    docsServiceMock.getOpenApi.mockReturnValue(throwError(() => new Error('Falha')));
    createComponent();
    activatedRouteMock.queryParams.next({ path: '__openapi__' });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(component['error']()).toBe('Não foi possível carregar o documento: __openapi__');
  });

  it('deve agrupar endpoints OpenAPI por tags e ordenar resultados', async () => {
    const mockDoc = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      tags: [
        { name: 'B-Tag', description: 'Desc B' },
        { name: 'A-Tag', description: 'Desc A' },
      ],
      paths: {
        '/user': {
          get: { tags: ['A-Tag'], summary: 'Get User', operationId: 'getUser' },
        },
        '/login': {
          post: { tags: ['B-Tag'], summary: 'Login', operationId: 'login' },
        },
        '/auth': {
          post: { tags: ['B-Tag'], summary: 'Auth', operationId: 'auth' },
        },
      },
    };

    docsServiceMock.getOpenApi.mockReturnValue(of(mockDoc));
    createComponent();
    activatedRouteMock.queryParams.next({ path: '__openapi__' });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const groups = component['openApiGroups']();
    expect(groups.length).toBe(2);
    expect(groups[0].tag).toBe('A-Tag');
    expect(groups[1].tag).toBe('B-Tag');

    const bGroup = groups[1];
    expect(bGroup.items[0].path).toBe('/auth');
    expect(bGroup.items[1].path).toBe('/login');

    expect(groups[0].description).toBe('Desc A');
  });

  it('deve lidar com endpoints sem tags', async () => {
    const mockDoc = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {
        '/test': {
          get: { summary: 'Test', operationId: 'test' },
        },
      },
    };

    docsServiceMock.getOpenApi.mockReturnValue(of(mockDoc));
    createComponent();
    activatedRouteMock.queryParams.next({ path: '__openapi__' });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const groups = component['openApiGroups']();
    expect(groups.find((g) => g.tag === 'untagged')).toBeTruthy();
  });
});

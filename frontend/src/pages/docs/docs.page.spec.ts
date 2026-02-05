/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivatedRoute, Router, provideRouter, type Params } from '@angular/router';
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

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('user/intro.md');
    const markdownEl = fixture.nativeElement.querySelector('[data-testid="docs-markdown"]');
    expect(markdownEl.textContent).toContain('Documentação Padrão');
  });

  it('deve carregar documento via slug', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Relatórios'));
    // Define contexto admin pois reports está no adminMapping
    activatedRouteMock.snapshot.data = { context: 'admin' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'reports' });
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('40-clients/pwa/reports-frontend.md');
  });

  it('NÃO deve carregar documento administrativo se estiver no contexto de usuário', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Relatórios'));
    // Define contexto user - mesmo reports estando no adminMapping, não deve carregar o path correto
    activatedRouteMock.snapshot.data = { context: 'user' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'reports' });
    fixture.detectChanges();

    // Quando não encontra no mapeamento do contexto atual, ele usa o próprio slug como fallback
    expect(docsServiceMock.getFile).toHaveBeenCalledWith('reports');
    expect(docsServiceMock.getFile).not.toHaveBeenCalledWith('40-clients/pwa/reports-frontend.md');
  });

  it('deve carregar documento de domínio via slug', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Domínio de Contas'));
    // Contexto padrão é user, onde dominio-contas está mapeado para a versão amigável
    createComponent();
    activatedRouteMock.params.next({ slug: 'dominio-contas' });
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('user/dominios/contas.md');
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

  it('deve carregar api-ref via slug apenas no contexto administrativo', () => {
    // Caso 1: Admin - Deve carregar OpenAPI
    activatedRouteMock.snapshot.data = { context: 'admin' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'api-ref' });
    fixture.detectChanges();
    expect(docsServiceMock.getOpenApi).toHaveBeenCalled();

    // Caso 2: User - Não deve carregar OpenAPI, cai no fallback de arquivo normal
    activatedRouteMock.snapshot.data = { context: 'user' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'api-ref' });
    fixture.detectChanges();
    expect(docsServiceMock.getFile).toHaveBeenCalledWith('api-ref');
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
    const externalTitleEl = fixture.nativeElement.querySelector(
      '[data-testid="docs-page"] > .mb-8 > h1',
    );
    expect(externalTitleEl).toBeNull();

    // Mas o conteúdo deve estar presente no markdown renderer (que terá seu próprio h1)
    const markdownEl = fixture.nativeElement.querySelector('[data-testid="docs-markdown"]');
    expect(markdownEl.textContent).toContain('Meu Título Interno');
  });

  it('deve exibir UI de redirecionamento do Swagger apenas quando o slug é swagger e o contexto é admin', () => {
    // Caso 1: Slug swagger no contexto admin (Deve funcionar)
    activatedRouteMock.snapshot.data = { context: 'admin' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'swagger' });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="docs-swagger-redirect"]'),
    ).toBeTruthy();

    // Caso 2: Slug swagger no contexto user (Não deve funcionar)
    activatedRouteMock.snapshot.data = { context: 'user' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'swagger' });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="docs-swagger-redirect"]'),
    ).toBeFalsy();
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
    // openapi está no adminMapping
    activatedRouteMock.snapshot.data = { context: 'admin' };
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
    docsServiceMock.getFile.mockReturnValue(of('# Título Sucesso'));
    // intro está no userMapping
    activatedRouteMock.snapshot.data = { context: 'user' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Verifica se preencheu o título (markdown usa título externo via Frontmatter ou vazio se não houver)
    // No caso de # Título Sucesso sem frontmatter, o markdown component renderiza o H1, mas o signal 'title' fica vazio
    expect(component['markdown']()).toContain('# Título Sucesso');

    // Agora simula erro no próximo carregamento
    docsServiceMock.getFile.mockReturnValue(throwError(() => new Error('Falha')));
    activatedRouteMock.params.next({ slug: 'erro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="docs-error"]');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Não foi possível carregar o documento');
    expect(errorEl.getAttribute('role')).toBe('alert');

    // Verifica se metadados foram limpos/resetados para estado de erro
    expect(component['title']()).toBe('Erro de Carregamento');
    expect(component['description']()).toBe('');
    expect(component['tags']()).toEqual([]);
  });

  it('deve reagir a mudanças sucessivas nos parâmetros', () => {
    docsServiceMock.getFile.mockReturnValue(of('# Relatórios'));
    // reports está no adminMapping
    activatedRouteMock.snapshot.data = { context: 'admin' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'reports' });
    fixture.detectChanges();
    expect(docsServiceMock.getFile).toHaveBeenCalledWith('40-clients/pwa/reports-frontend.md');

    // Segundo acesso (mudança de rota)
    docsServiceMock.getFile.mockReturnValue(of('# Intro'));
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    expect(docsServiceMock.getFile).toHaveBeenCalledWith('admin/intro.md');
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

  it('deve interceptar cliques em links relativos e navegar usando o router', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    // Simula conteúdo com link relativo
    docsServiceMock.getFile.mockReturnValue(
      of('# Princípios\n[Metas](../10-product/dominio-metas.md)'),
    );
    createComponent();

    // Simula estar na página de princípios (00-overview/principles.md)
    activatedRouteMock.params.next({ slug: 'principles' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('../10-product/dominio-metas.md');

    // Intercepta o evento de clique
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    fixture.detectChanges();

    // Deve ter prevenido o comportamento padrão e navegado via router
    expect(event.defaultPrevented).toBe(true);
    // principles (00-overview/principles.md) + ../10-product/dominio-metas.md = 10-product/dominio-metas.md
    // O slug resultante é 'dominio-metas' (via pop() ou mapeamento)
    expect(navigateSpy).toHaveBeenCalledWith(['/docs', 'dominio-metas']);
  });

  it('deve lidar com links de âncora na mesma página', async () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      /* mock */
    });
    const scrollIntoViewSpy = vi.fn();

    // Mock do elemento alvo
    const targetId = 'secao-1';
    const targetElement = document.createElement('div');
    targetElement.id = targetId;
    targetElement.scrollIntoView = scrollIntoViewSpy;
    document.body.appendChild(targetElement);

    docsServiceMock.getFile.mockReturnValue(of('# Teste\n[Ir para Seção 1](#secao-1)'));
    createComponent();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a[href^="#"]');
    anchor.click();

    expect(scrollIntoViewSpy).toHaveBeenCalled();

    document.body.removeChild(targetElement);
    scrollSpy.mockRestore();
  });

  it('deve resolver links para openapi.json como o slug api-ref apenas no contexto administrativo', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    // Caso 1: Admin - Deve resolver para api-ref
    activatedRouteMock.snapshot.data = { context: 'admin' };
    docsServiceMock.getFile.mockReturnValue(of('# API\n[JSON](../30-api/openapi.json)'));
    createComponent();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a');
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(navigateSpy).toHaveBeenCalledWith(['/docs/admin', 'api-ref']);

    // Caso 2: User - Não deve resolver para api-ref, deve usar o nome do arquivo (fallback)
    activatedRouteMock.snapshot.data = { context: 'user' };
    createComponent();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const anchorUser = fixture.nativeElement.querySelector('a');
    anchorUser.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(navigateSpy).toHaveBeenCalledWith(['/docs', 'openapi.json']);
  });
});

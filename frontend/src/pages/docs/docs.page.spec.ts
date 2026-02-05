/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivatedRoute, Router, type Params } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
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
    resolvePathFromSlug: ReturnType<typeof vi.fn>;
    resolveSlugFromPath: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let activatedRouteMock: {
    params: BehaviorSubject<Params>;
    queryParams: BehaviorSubject<Params>;
    snapshot: ActivatedRoute['snapshot'];
  };

  beforeEach(async () => {
    routerMock = {
      navigate: vi.fn(),
    };
    docsServiceMock = {
      getFile: vi.fn(() => of('')),
      getOpenApi: vi.fn(() =>
        of({ openapi: '3.0.0', info: { title: '', version: '' }, paths: {} }),
      ),
      getSwaggerUiUrl: vi.fn(() => 'https://api.dindinho.com/docs'),
      resolvePathFromSlug: vi.fn((context, slug) => {
        if (context === 'admin' && slug === 'reports') return '40-plataformas/pwa/relatorios.md';
        if (slug === 'intro') return context === 'admin' ? 'admin/intro.md' : 'user/intro.md';
        if (slug === 'openapi' || slug === 'api-ref') return '__openapi__';
        if (slug === 'principles') return '00-overview/principles.md';
        if (slug === 'dominio-contas') return '10-produto/contas/guia-usuario.md';
        if (slug === 'metas') return '10-product/dominio-metas.md';
        return null;
      }),
      resolveSlugFromPath: vi.fn((context, path) => {
        if (context === 'admin' && path.includes('openapi.json')) return 'api-ref';
        if (path.includes('dominio-metas.md')) return 'dominio-metas';
        return null;
      }),
    };

    activatedRouteMock = {
      params: new BehaviorSubject<Params>({}),
      queryParams: new BehaviorSubject<Params>({}),
      snapshot: { data: {} } as ActivatedRoute['snapshot'],
    };

    await TestBed.configureTestingModule({
      imports: [DocsPage],
      providers: [
        { provide: Router, useValue: routerMock },
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

  const createComponent = async () => {
    fixture = TestBed.createComponent(DocsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  afterEach(() => {
    fixture.destroy();
  });

  it('deve criar o componente', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('deve usar a tag <section> como container principal para acessibilidade dentro do layout', async () => {
    await createComponent();
    const sectionEl = fixture.nativeElement.querySelector('section[data-testid="docs-page"]');
    expect(sectionEl).toBeTruthy();
    expect(sectionEl.getAttribute('aria-label')).toBe('Conteúdo da Documentação');
  });

  it('deve redirecionar para intro se nenhum slug ou path for fornecido', async () => {
    await createComponent();
    activatedRouteMock.params.next({});
    activatedRouteMock.queryParams.next({});
    fixture.detectChanges();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/docs/intro'], { replaceUrl: true });
  });

  it('deve carregar markdown padrão ao receber slug intro', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Documentação Padrão'));
    await createComponent();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('user/intro.md');
    const markdownEl = fixture.nativeElement.querySelector('[data-testid="docs-markdown"]');
    expect(markdownEl.textContent).toContain('Documentação Padrão');
  });

  it('deve redirecionar para admin/intro quando context é admin e nenhum slug é fornecido', async () => {
    activatedRouteMock.snapshot.data = { context: 'admin' };
    await createComponent();
    activatedRouteMock.params.next({});
    activatedRouteMock.queryParams.next({});
    fixture.detectChanges();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/docs/admin/intro'], { replaceUrl: true });
  });

  it('deve carregar documento via slug', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Relatórios'));
    // Define contexto admin pois reports está no adminMapping
    activatedRouteMock.snapshot.data = { context: 'admin' };
    await createComponent();
    activatedRouteMock.params.next({ slug: 'reports' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('40-plataformas/pwa/relatorios.md');
  });

  it('NÃO deve carregar documento administrativo se estiver no contexto de usuário', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Relatórios'));
    // Define contexto user
    activatedRouteMock.snapshot.data = { context: 'user' };
    await createComponent();
    activatedRouteMock.params.next({ slug: 'reports' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // No contexto de usuário, 'reports' não deve resolver para o path administrativo
    // e como não há fallback automático para o slug como path, deve dar erro
    expect(docsServiceMock.getFile).not.toHaveBeenCalled();
    expect(component['error']()).toBe('Documento não encontrado');
  });

  it('deve carregar documento de domínio via slug', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Domínio de Contas'));
    // Contexto padrão é user, onde dominio-contas está mapeado para a versão amigável
    await createComponent();
    activatedRouteMock.params.next({ slug: 'dominio-contas' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('10-produto/contas/guia-usuario.md');
  });

  it('deve carregar intro de admin quando context é admin', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Admin Intro'));

    // Simula data da rota no mock
    activatedRouteMock.snapshot.data = { context: 'admin' };

    await createComponent();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('admin/intro.md');
  });

  it('deve carregar api-ref via slug apenas no contexto administrativo', async () => {
    activatedRouteMock.snapshot.data = { context: 'admin' };
    await createComponent();
    activatedRouteMock.params.next({ slug: 'api-ref' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // No contexto admin, api-ref carrega o OpenAPI
    expect(docsServiceMock.getOpenApi).toHaveBeenCalled();
  });

  it('deve carregar documento via query param path', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Auth'));
    await createComponent();
    activatedRouteMock.queryParams.next({ path: '30-api/authentication.md' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsServiceMock.getFile).toHaveBeenCalledWith('30-api/authentication.md');
  });

  it('deve processar frontmatter corretamente', async () => {
    const md = `---\ntitle: "Meu Título"\ndescription: "Minha Descrição"\ntags: ["test", "frontmatter"]\n---\n# Meu Título Interno\nConteúdo`;
    docsServiceMock.getFile.mockReturnValue(of(md));
    await createComponent();
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

  it('deve exibir UI de redirecionamento do Swagger apenas quando o slug é swagger e o contexto é admin', async () => {
    // Caso 1: Slug swagger no contexto admin
    activatedRouteMock.snapshot.data['context'] = 'admin';
    activatedRouteMock.params.next({ slug: 'swagger' });
    await createComponent();

    const swaggerEl = fixture.nativeElement.querySelector('[data-testid="docs-swagger-redirect"]');
    expect(swaggerEl).toBeTruthy();

    // Caso 2: Slug swagger no contexto user (Não deve funcionar)
    activatedRouteMock.snapshot.data['context'] = 'user';
    activatedRouteMock.params.next({ slug: 'swagger' });
    await createComponent();

    const swaggerElUser = fixture.nativeElement.querySelector(
      '[data-testid="docs-swagger-redirect"]',
    );
    expect(swaggerElUser).toBeFalsy();
  });

  it('deve renderizar OpenAPI quando o path é __openapi__', async () => {
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
    await createComponent();
    activatedRouteMock.params.next({ slug: 'openapi' });
    fixture.detectChanges();
    await fixture.whenStable();
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

  it('deve exibir estado de carregamento com skeleton e aria-busy', async () => {
    docsServiceMock.getFile.mockReturnValue(new Subject<string>().asObservable()); // Nunca emite automaticamente
    fixture = TestBed.createComponent(DocsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();

    const loadingEl = fixture.nativeElement.querySelector('[data-testid="docs-loading"]');
    expect(loadingEl).toBeTruthy();
    expect(loadingEl.getAttribute('aria-busy')).toBe('true');
    expect(loadingEl.getAttribute('aria-label')).toBe('Carregando conteúdo');

    // Verifica se os containers principais têm aria-busy
    const busyContainers = fixture.nativeElement.querySelectorAll('[aria-busy="true"]');
    expect(busyContainers.length).toBeGreaterThan(1);
  });

  it('deve ter atributos de acessibilidade no conteúdo markdown', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Teste'));
    await createComponent();
    activatedRouteMock.params.next({});
    fixture.detectChanges();
    await fixture.whenStable();
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
    await createComponent();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Verifica se preencheu o título (markdown usa título externo via Frontmatter ou vazio se não houver)
    // No caso de # Título Sucesso sem frontmatter, o markdown component renderiza o H1, mas o signal 'title' fica vazio
    expect(component['markdown']()).toContain('# Título Sucesso');

    // Agora simula erro no próximo carregamento
    docsServiceMock.getFile.mockReturnValue(throwError(() => new Error('Falha')));
    activatedRouteMock.params.next({ slug: 'intro' });
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

  it('deve reagir a mudanças sucessivas nos parâmetros', async () => {
    docsServiceMock.getFile.mockReturnValue(of('# Relatórios'));
    // reports está no adminMapping
    activatedRouteMock.snapshot.data = { context: 'admin' };
    await createComponent();
    activatedRouteMock.params.next({ slug: 'reports' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(docsServiceMock.getFile).toHaveBeenCalledWith('40-plataformas/pwa/relatorios.md');

    // Segundo acesso (mudança de rota)
    docsServiceMock.getFile.mockReturnValue(of('# Intro'));
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(docsServiceMock.getFile).toHaveBeenCalledWith('admin/intro.md');
  });

  it('deve lidar com falha no carregamento do OpenAPI', async () => {
    docsServiceMock.getOpenApi.mockReturnValue(throwError(() => new Error('Falha')));
    await createComponent();
    activatedRouteMock.queryParams.next({ path: '__openapi__' });
    fixture.detectChanges();
    await fixture.whenStable();
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
    await createComponent();
    activatedRouteMock.queryParams.next({ path: '__openapi__' });
    fixture.detectChanges();
    await fixture.whenStable();
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
    await createComponent();
    activatedRouteMock.queryParams.next({ path: '__openapi__' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const groups = component['openApiGroups']();
    expect(groups.find((g) => g.tag === 'untagged')).toBeTruthy();
  });

  it('deve interceptar cliques em links relativos e navegar usando o router', async () => {
    // Simula conteúdo com link relativo
    docsServiceMock.getFile.mockReturnValue(
      of('# Princípios\n[Metas](../10-product/dominio-metas.md)'),
    );
    activatedRouteMock.snapshot.data = { context: 'user' };
    await createComponent();
    routerMock.navigate.mockClear();

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
    expect(routerMock.navigate).toHaveBeenCalledWith(['/docs', 'dominio-metas']);
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
    await createComponent();
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
    // Caso 1: Admin - Deve resolver para api-ref
    activatedRouteMock.snapshot.data = { context: 'admin' };
    docsServiceMock.getFile.mockReturnValue(of('# API\n[JSON](../30-api/openapi.json)'));
    await createComponent();
    routerMock.navigate.mockClear(); // Limpa navegação inicial de redirecionamento
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a');
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(routerMock.navigate).toHaveBeenCalledWith(['/docs/admin', 'api-ref']);

    // Caso 2: User - Não deve resolver para api-ref, deve usar o nome do arquivo (fallback)
    activatedRouteMock.snapshot.data = { context: 'user' };
    await createComponent();
    routerMock.navigate.mockClear();
    activatedRouteMock.params.next({ slug: 'intro' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const anchorUser = fixture.nativeElement.querySelector('a');
    anchorUser.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    // Não deve navegar via router porque o slug não foi resolvido (contexto user)
    // O evento de clique não deve ser prevenido pelo handler
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});

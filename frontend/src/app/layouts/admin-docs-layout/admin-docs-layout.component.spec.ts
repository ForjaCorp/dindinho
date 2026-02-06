/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { AdminDocsLayoutComponent } from './admin-docs-layout.component';
import { AuthService, UserState } from '../../services/auth.service';
import { SidebarCategory, SidebarItem } from '../base-docs-layout/base-docs-layout.component';
import { SystemRole } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('AdminDocsLayoutComponent', () => {
  let fixture: ComponentFixture<AdminDocsLayoutComponent>;
  let component: AdminDocsLayoutComponent;
  let currentUserSignal: WritableSignal<UserState | null>;
  let authServiceMock: Partial<AuthService> & {
    isAuthenticated: Mock;
    currentUser: WritableSignal<UserState | null>;
  };

  beforeEach(async () => {
    currentUserSignal = signal<UserState | null>({
      id: '1',
      name: 'Admin',
      email: 'admin@test.com',
      systemRole: SystemRole.ADMIN,
    });
    authServiceMock = {
      isAuthenticated: vi.fn(() => currentUserSignal() !== null),
      currentUser: currentUserSignal,
    };

    await TestBed.configureTestingModule({
      imports: [AdminDocsLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDocsLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve ter atributos de acessibilidade no link de visão do usuário', () => {
    const link = fixture.nativeElement.querySelector('[data-testid="user-view-link"]');
    expect(link.getAttribute('aria-label')).toBe('Ir para a visão pública do usuário');

    const ariaHidden = link.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHidden.length).toBeGreaterThan(0);
  });

  it('deve ter atributos de acessibilidade no botão de voltar', () => {
    const button = fixture.nativeElement.querySelector('[data-testid="back-to-app-button"]');
    expect(button.getAttribute('aria-label')).toBe('Voltar para a Plataforma');

    const ariaHidden = button.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHidden.length).toBeGreaterThan(0);
  });

  it('deve mostrar texto correto no botão de voltar quando não autenticado', () => {
    currentUserSignal.set(null);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="back-to-app-button"]');
    expect(button.getAttribute('aria-label')).toBe('Entrar no Dindinho');
  });

  it('deve garantir que todos os plannings críticos estão na sidebar', () => {
    const categories = component['categories'];
    const backlogItems = categories.find((c: SidebarCategory) => c.id === 'backlog')?.items || [];

    const criticalPlans = [
      { id: 'plan-invites', label: 'Sistema de Convites' },
      { id: 'refactor-roles', label: 'Refatoração de Roles' },
      { id: 'plan-notifications', label: 'Sistema de Notificações' },
      { id: 'plan-goals', label: 'Planejamento de Metas' },
    ];

    criticalPlans.forEach((plan) => {
      const item = backlogItems.find((i: SidebarItem) => i.id === plan.id);
      expect(item, `O planning ${plan.label} (${plan.id}) deve estar na sidebar`).toBeTruthy();
    });
  });
});

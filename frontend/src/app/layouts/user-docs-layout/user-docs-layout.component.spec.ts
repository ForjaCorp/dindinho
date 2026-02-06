/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { UserDocsLayoutComponent } from './user-docs-layout.component';
import { AuthService, UserState } from '../../services/auth.service';
import { SystemRole } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('UserDocsLayoutComponent', () => {
  let fixture: ComponentFixture<UserDocsLayoutComponent>;
  let component: UserDocsLayoutComponent;
  let currentUserSignal: WritableSignal<UserState | null>;
  let authServiceMock: Partial<AuthService> & {
    isAuthenticated: Mock;
    currentUser: WritableSignal<UserState | null>;
  };

  beforeEach(async () => {
    currentUserSignal = signal<UserState | null>({
      id: '1',
      name: 'User',
      email: 'user@test.com',
      systemRole: SystemRole.USER,
    });
    authServiceMock = {
      isAuthenticated: vi.fn(() => currentUserSignal() !== null),
      currentUser: currentUserSignal,
    };

    await TestBed.configureTestingModule({
      imports: [UserDocsLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDocsLayoutComponent);
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

  it('deve ter atributos de acessibilidade no botão de site institucional', () => {
    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Ir para o site institucional"]',
    );
    expect(button).toBeTruthy();

    const ariaHidden = button.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHidden.length).toBeGreaterThan(0);
  });

  it('deve mostrar link do painel admin apenas para administradores', () => {
    // Caso 1: Usuário comum (não deve ver)
    currentUserSignal.set({
      id: '1',
      name: 'User',
      email: 'user@test.com',
      systemRole: SystemRole.USER,
    });
    fixture.detectChanges();
    let link = fixture.nativeElement.querySelector('[data-testid="admin-panel-link"]');
    expect(link).toBeFalsy();

    // Caso 2: Administrador (deve ver com atributos de acessibilidade)
    currentUserSignal.set({
      id: '1',
      name: 'Admin',
      email: 'admin@test.com',
      systemRole: SystemRole.ADMIN,
    });
    fixture.detectChanges();
    link = fixture.nativeElement.querySelector('[data-testid="admin-panel-link"]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('aria-label')).toBe('Acessar o painel administrativo de documentação');

    const ariaHidden = link.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHidden.length).toBeGreaterThan(0);
  });

  it('deve ter atributos de acessibilidade no botão de voltar', () => {
    const button = fixture.nativeElement.querySelector('[data-testid="back-to-app-button"]');
    expect(button.getAttribute('aria-label')).toBe('Voltar para a Plataforma');
  });
});

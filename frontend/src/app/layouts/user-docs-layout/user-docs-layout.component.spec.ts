/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { UserDocsLayoutComponent } from './user-docs-layout.component';
import { AuthService } from '../../services/auth.service';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { UserState } from '../../services/auth.service';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('UserDocsLayoutComponent (QA)', () => {
  let authServiceMock: {
    currentUser: WritableSignal<UserState | null>;
    isAuthenticated: WritableSignal<boolean>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    authServiceMock = {
      currentUser: signal<UserState | null>(null),
      isAuthenticated: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [UserDocsLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();
  });

  it('deve ocultar o botão de Painel Admin quando o usuário não é admin', () => {
    authServiceMock.currentUser.set({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'VIEWER',
    });
    const fixture = TestBed.createComponent(UserDocsLayoutComponent);
    fixture.detectChanges();

    const adminBtn = fixture.debugElement.query(By.css('[data-testid="admin-panel-link"]'));
    expect(adminBtn).toBeNull();
  });

  it('deve mostrar o botão de Painel Admin quando o usuário é ADMIN', () => {
    authServiceMock.currentUser.set({
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    const fixture = TestBed.createComponent(UserDocsLayoutComponent);
    fixture.detectChanges();

    const adminBtn = fixture.debugElement.query(By.css('[data-testid="admin-panel-link"]'));
    expect(adminBtn).not.toBeNull();

    const label = adminBtn.nativeElement.textContent;
    expect(label).toContain('Painel Admin');
  });

  it('deve mostrar o texto correto no botão de ação quando autenticado', () => {
    authServiceMock.isAuthenticated.set(true);
    const fixture = TestBed.createComponent(UserDocsLayoutComponent);
    fixture.detectChanges();

    const backBtn = fixture.debugElement.query(By.css('[data-testid="back-to-app-button"]'));
    expect(backBtn.nativeElement.textContent).toContain('Voltar para a Plataforma');
  });

  it('deve mostrar o texto correto no botão de ação quando não autenticado', () => {
    authServiceMock.isAuthenticated.set(false);
    const fixture = TestBed.createComponent(UserDocsLayoutComponent);
    fixture.detectChanges();

    const loginBtn = fixture.debugElement.query(By.css('[data-testid="back-to-app-button"]'));
    expect(loginBtn.nativeElement.textContent).toContain('Entrar no Dindinho');
  });
});

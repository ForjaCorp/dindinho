/**
 * Testes de unidade para a página de perfil.
 *
 * Este arquivo contém testes para garantir o funcionamento correto
 * da página de perfil, que exibe informações do usuário e permite logout.
 */

/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ProfilePage } from './profile.page';
import { AuthService, UserState } from '../app/services/auth.service';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let authServiceMock: {
    currentUser: ReturnType<typeof signal<UserState | null>>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    authServiceMock = {
      currentUser: signal<UserState | null>({
        id: 'user-1',
        name: 'Usuário Teste',
        email: 'test@example.com',
        role: 'EDITOR',
      }),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o nome do usuário corretamente', () => {
    // Busca o elemento pelo data-testid que contém o nome
    const nameElement = fixture.nativeElement.querySelector('[data-testid="user-name"]');
    expect(nameElement).toBeTruthy();
    expect(nameElement.textContent).toContain('Usuário Teste');
  });

  it('deve chamar o método logout ao clicar no botão de sair', () => {
    const logoutButton = fixture.nativeElement.querySelector('[data-testid="logout-button"]');
    expect(logoutButton).toBeTruthy();

    logoutButton.click();
    expect(authServiceMock.logout).toHaveBeenCalled();
  });

  it('deve exibir a versão do aplicativo', () => {
    const versionElement = fixture.nativeElement.querySelector('[data-testid="app-version"]');
    expect(versionElement).toBeTruthy();
    expect(versionElement.textContent).toContain('Dindinho v1.0.0-dev');
  });
});

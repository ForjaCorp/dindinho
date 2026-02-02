/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { AuthService, UserState } from './auth.service';
import { ApiService } from './api.service';
import { LoginDTO, LoginResponseDTO } from '@dindinho/shared';
import { of, throwError } from 'rxjs';

// Mock do jwt-decode
vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(() => ({
    sub: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'VIEWER',
    iat: 1234567890,
    exp: 1234567890 + 3600,
  })),
}));
describe('AuthService', () => {
  let service: AuthService;
  let router: Router;
  let apiService: ApiService;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  const mockUser: UserState = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'VIEWER',
  };

  const mockLoginResponse: LoginResponseDTO = {
    user: mockUser,
    token: 'test-token',
    refreshToken: 'test-refresh',
  };

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const apiServiceSpy = {
      login: vi.fn(),
      refresh: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]), // Provide empty routes for service tests
        provideLocationMocks(),
        AuthService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    apiService = TestBed.inject(ApiService);

    // Mock do router.navigate para evitar erros de rota inexistente
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    localStorage.clear(); // Limpa o storage antes de cada teste
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear(); // Limpa o storage depois de cada teste
    TestBed.resetTestingModule();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login user and store token', async () => {
      const credentials: LoginDTO = { email: 'test@example.com', password: 'password123' };
      vi.spyOn(apiService, 'login').mockReturnValue(of(mockLoginResponse));

      const setItemSpy = vi.spyOn(localStorage, 'setItem');

      await new Promise<void>((done) => {
        service.login(credentials).subscribe((response) => {
          expect(response).toEqual(mockLoginResponse);
          expect(setItemSpy).toHaveBeenCalledWith('dindinho_token', 'test-token');
          expect(setItemSpy).toHaveBeenCalledWith('dindinho_refresh_token', 'test-refresh');
          expect(service.currentUser()).toBeTruthy();
          done();
        });
      });
    });

    it('should handle login error', async () => {
      const credentials: LoginDTO = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      const errorResponse = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Unauthorized' },
        url: 'http://localhost/api/login',
      });

      vi.spyOn(apiService, 'login').mockReturnValue(throwError(() => errorResponse));

      await new Promise<void>((done) => {
        service.login(credentials).subscribe({
          error: (err) => {
            expect(err).toEqual({
              type: 'AUTH',
              message: 'Unauthorized',
              code: 401,
              details: errorResponse.error,
              originalError: errorResponse,
            });
            expect(service.currentUser()).toBeNull();
            done();
          },
        });
      });
    }, 10000);
  });

  describe('logout', () => {
    it('should clear token and user data on logout', () => {
      // Simula um estado de login
      localStorage.setItem('dindinho_token', 'some-token');
      localStorage.setItem('dindinho_refresh_token', 'some-refresh-token');
      service.currentUser.set(mockUser);

      const removeItemSpy = vi.spyOn(localStorage, 'removeItem');
      const navigateSpy = vi.spyOn(router, 'navigate');

      service.logout();

      expect(removeItemSpy).toHaveBeenCalledWith('dindinho_token');
      expect(removeItemSpy).toHaveBeenCalledWith('dindinho_refresh_token');
      expect(service.currentUser()).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and update storage', async () => {
      const mockRefreshResponse = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };
      // Configura o estado inicial do localStorage
      localStorage.setItem('dindinho_refresh_token', 'old-refresh-token');

      vi.spyOn(apiService, 'refresh').mockReturnValue(of(mockRefreshResponse));
      const setItemSpy = vi.spyOn(localStorage, 'setItem');

      await new Promise<void>((done) => {
        service.refreshToken().subscribe((newToken) => {
          expect(newToken).toBe('new-token');
          expect(setItemSpy).toHaveBeenCalledWith('dindinho_token', 'new-token');
          expect(setItemSpy).toHaveBeenCalledWith('dindinho_refresh_token', 'new-refresh-token');
          done();
        });
      });
    });

    it('should logout if no refresh token available', async () => {
      // Garante que o refresh token não existe
      localStorage.removeItem('dindinho_refresh_token');
      const logoutSpy = vi.spyOn(service, 'logout');

      await new Promise<void>((done) => {
        service.refreshToken().subscribe({
          error: (err) => {
            expect(logoutSpy).toHaveBeenCalled();
            expect(err.message).toBe('No refresh token available');
            done();
          },
        });
      });
    });

    it('should logout on refresh error', async () => {
      // Configura o estado inicial do localStorage
      localStorage.setItem('dindinho_refresh_token', 'old-refresh-token');

      vi.spyOn(apiService, 'refresh').mockReturnValue(
        throwError(() => new Error('Refresh failed')),
      );
      const logoutSpy = vi.spyOn(service, 'logout');

      await new Promise<void>((done) => {
        service.refreshToken().subscribe({
          error: (err) => {
            expect(logoutSpy).toHaveBeenCalled();
            expect(err.message).toBe('Refresh failed');
            done();
          },
        });
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if user is authenticated', () => {
      service.currentUser.set({
        id: '1',
        name: 'User',
        email: 'user@test.com',
        role: 'VIEWER',
      });
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false if user is not authenticated', () => {
      service.currentUser.set(null);
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});

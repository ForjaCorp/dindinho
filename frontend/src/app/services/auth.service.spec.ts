import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
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
    iat: 1234567890,
    exp: 1234567890 + 3600,
  })),
}));
describe('AuthService', () => {
  let service: AuthService;
  let router: Router;
  let apiService: ApiService;

  const mockUser: UserState = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockLoginResponse: LoginResponseDTO = {
    user: mockUser,
    token: 'test-token',
  };

  beforeEach(() => {
    const apiServiceSpy = {
      login: vi.fn(),
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
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.removeItem('dindinho_token');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login user and store token', async () => {
      const credentials: LoginDTO = { email: 'test@example.com', password: 'password123' };
      vi.spyOn(apiService, 'login').mockReturnValue(of(mockLoginResponse));

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      await new Promise<void>((done) => {
        service.login(credentials).subscribe((response) => {
          expect(response).toEqual(mockLoginResponse);
          expect(setItemSpy).toHaveBeenCalledWith('dindinho_token', 'test-token');
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
      const errorResponse = { status: 401, message: 'Unauthorized' };

      vi.spyOn(apiService, 'login').mockReturnValue(throwError(() => errorResponse));

      await new Promise<void>((done) => {
        service.login(credentials).subscribe({
          error: (err) => {
            expect(err).toEqual({
              type: 'INVALID_CREDENTIALS',
              message: 'Email ou senha incorretos. Verifique suas credenciais.',
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
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
      const navigateSpy = vi.spyOn(router, 'navigate');

      service.logout();

      expect(removeItemSpy).toHaveBeenCalledWith('dindinho_token');
      expect(service.currentUser()).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if user is authenticated', () => {
      // eslint-disable-next-line
      (service.currentUser as any).set({ sub: '1', name: 'User' });
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false if user is not authenticated', () => {
      // eslint-disable-next-line
      (service.currentUser as any).set(null);
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});

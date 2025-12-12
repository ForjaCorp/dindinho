import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { ApiResponseDTO, LoginDTO, LoginResponseDTO } from '@dindinho/shared';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const mockApiResponse: ApiResponseDTO = {
    message: 'Hello from backend!',
    docs: 'API documentation available at /docs',
    endpoints: {
      health: '/health',
      test_db: '/test-db',
    },
  };

  const mockLoginData: LoginDTO = {
    email: 'test@example.com',
    password: 'password123',
  };

  const mockLoginResponse: LoginResponseDTO = {
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
    },
    token: 'mock-jwt-token',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create service', () => {
    expect(service).toBeTruthy();
  });

  describe('getHello()', () => {
    it('should make GET request to base URL', () => {
      service.getHello().subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne('http://localhost:3333');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should handle error response', () => {
      service.getHello().subscribe({
        next: () => expect.unreachable('should have failed with 500 error'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error).toBe('Server error');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333');
      expect(req.request.method).toBe('GET');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network error', () => {
      service.getHello().subscribe({
        next: () => expect.unreachable('should have failed with network error'),
        error: (error) => {
          expect(error.status).toBe(0);
        },
      });

      const req = httpMock.expectOne('http://localhost:3333');
      expect(req.request.method).toBe('GET');
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('login()', () => {
    it('should make POST request to login endpoint', () => {
      service.login(mockLoginData).subscribe((response) => {
        expect(response).toEqual(mockLoginResponse);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginData);
      req.flush(mockLoginResponse);
    });

    it('should handle login error (401)', () => {
      service.login(mockLoginData).subscribe({
        next: () => expect.unreachable('should have failed with 401 error'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error).toBe('Unauthorized');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle login error (400)', () => {
      service.login(mockLoginData).subscribe({
        next: () => expect.unreachable('should have failed with 400 error'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error).toBe('Bad request');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle network error on login', () => {
      service.login(mockLoginData).subscribe({
        next: () => expect.unreachable('should have failed with network error'),
        error: (error) => {
          expect(error.status).toBe(0);
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      req.error(new ErrorEvent('Network error'));
    });

    it('should send correct headers', () => {
      service.login(mockLoginData).subscribe((response) => {
        expect(response).toEqual(mockLoginResponse);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginData);
      req.flush(mockLoginResponse);
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});

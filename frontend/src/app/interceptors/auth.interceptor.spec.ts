/**
 * @vitest-environment jsdom
 */
import { TestBed, getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
}

import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor, resetInterceptorState } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { of, throwError, Subject } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    resetInterceptorState();
    localStorage.clear();

    const authServiceSpy = {
      refreshToken: vi.fn(),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    httpMock.verify();
    localStorage.clear();
  });

  it('should add Authorization header', () => {
    localStorage.setItem('dindinho_token', 'test-token');

    http.get('/api/data').subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('should not add header if no token', () => {
    http.get('/api/data').subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should not add header for external requests', () => {
    localStorage.setItem('dindinho_token', 'test-token');

    http.get('https://external.api/data').subscribe();

    const req = httpMock.expectOne('https://external.api/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should refresh token on 401 and retry', () => {
    localStorage.setItem('dindinho_token', 'expired-token');
    vi.spyOn(authService, 'refreshToken').mockReturnValue(of('new-token'));

    http.get('/api/data').subscribe();

    const req = httpMock.expectOne('/api/data');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).toHaveBeenCalled();

    const retryReq = httpMock.expectOne('/api/data');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
    retryReq.flush({});
  });

  it('should logout on refresh failure', () => {
    localStorage.setItem('dindinho_token', 'expired-token');
    vi.spyOn(authService, 'refreshToken').mockReturnValue(
      throwError(() => new Error('Refresh failed')),
    );

    http.get('/api/data').subscribe({
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne('/api/data');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should handle concurrent requests (mutex)', () => {
    localStorage.setItem('dindinho_token', 'expired-token');

    // Simulate slow refresh using Subject
    const refreshTokenSubject = new Subject<string>();
    vi.spyOn(authService, 'refreshToken').mockReturnValue(refreshTokenSubject.asObservable());

    // Request 1
    http.get('/api/data1').subscribe();
    // Request 2
    http.get('/api/data2').subscribe();

    const req1 = httpMock.expectOne('/api/data1');
    const req2 = httpMock.expectOne('/api/data2');

    // Fail first request - triggers refresh
    req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Fail second request - should wait
    req2.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Should call refresh only once
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);

    // Emit new token
    refreshTokenSubject.next('new-token');
    refreshTokenSubject.complete();

    // Both should retry with new token
    const retryReq1 = httpMock.expectOne('/api/data1');
    const retryReq2 = httpMock.expectOne('/api/data2');

    expect(retryReq1.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retryReq2.request.headers.get('Authorization')).toBe('Bearer new-token');

    retryReq1.flush({});
    retryReq2.flush({});
  });
});

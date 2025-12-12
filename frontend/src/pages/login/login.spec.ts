import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { LoginComponent } from './login.page';
import { AuthService, UserState } from '../../app/services/auth.service';
import { of, throwError, Subject } from 'rxjs';
import { LoginDTO } from '@dindinho/shared';
import { By } from '@angular/platform-browser';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;

  const mockUser: UserState = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockToken = 'test-token';

  beforeEach(async () => {
    const authServiceSpy = {
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        CardModule,
        PasswordModule,
        LoginComponent,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: LoginComponent }]),
        provideLocationMocks(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    vi.clearAllMocks();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line
  const getComponentAny = () => component as any;

  it('should initialize form with empty fields', () => {
    expect(getComponentAny().loginForm.get('email')?.value).toBe('');
    expect(getComponentAny().loginForm.get('password')?.value).toBe('');
  });

  it('should make email control required', () => {
    const emailControl = getComponentAny().loginForm.get('email');
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBe(true);

    emailControl?.setValue('test@example.com');
    expect(emailControl?.hasError('required')).toBe(false);
  });

  it('should validate email format', () => {
    const emailControl = getComponentAny().loginForm.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);

    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBe(false);
  });

  it('should make password control required', () => {
    const passwordControl = getComponentAny().loginForm.get('password');
    passwordControl?.setValue('');
    expect(passwordControl?.hasError('required')).toBe(true);

    passwordControl?.setValue('password123');
    expect(passwordControl?.hasError('required')).toBe(false);
  });

  describe('onSubmit()', () => {
    it('should not call authService.login if form is invalid', () => {
      getComponentAny().loginForm.setValue({ email: '', password: '' });

      component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should set loading to true when form is submitted', () => {
      getComponentAny().loginForm.setValue({ email: 'test@example.com', password: 'password123' });
      // eslint-disable-next-line
      const loginSubject = new Subject<any>();
      vi.spyOn(authService, 'login').mockReturnValue(loginSubject);
      component.onSubmit();
      expect(getComponentAny().isLoading()).toBe(true);
      loginSubject.complete();
    });

    it('should call authService.login with form values when form is valid', () => {
      const credentials: LoginDTO = {
        email: 'test@example.com',
        password: 'password123',
      };
      getComponentAny().loginForm.setValue(credentials);
      vi.spyOn(authService, 'login').mockReturnValue(
        of({ user: mockUser, token: mockToken, refreshToken: 'mock-refresh' }),
      );

      component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith(credentials);
    });

    it('should set error message on 401 error', () => {
      getComponentAny().loginForm.setValue({ email: 'test@example.com', password: 'wrong' });
      const errorResponse = { status: 401 };
      vi.spyOn(authService, 'login').mockReturnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(getComponentAny().errorMessage()).toBe('Email ou senha incorretos.');
      expect(getComponentAny().isLoading()).toBe(false);
    });

    it('should set error message on connection error', () => {
      getComponentAny().loginForm.setValue({ email: 'test@example.com', password: 'password' });
      const errorResponse = { status: 0 };
      vi.spyOn(authService, 'login').mockReturnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(getComponentAny().errorMessage()).toContain('Não foi possível conectar');
    });

    it('should set generic error message for other errors', () => {
      getComponentAny().loginForm.setValue({ email: 'test@example.com', password: 'password' });
      const errorResponse = { status: 500 };
      vi.spyOn(authService, 'login').mockReturnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(getComponentAny().errorMessage()).toContain('Ocorreu um erro');
    });
  });

  describe('isFieldInvalid()', () => {
    it('should return false for pristine and untouched fields', () => {
      const fieldName = 'email';
      const result = component.isFieldInvalid(fieldName);
      expect(result).toBe(false);
    });

    it('should return true for invalid and touched fields', () => {
      const fieldName = 'email';
      const control = getComponentAny().loginForm.get(fieldName);
      control?.markAsTouched();
      control?.setValue('');

      const result = component.isFieldInvalid(fieldName);

      expect(result).toBe(true);
    });
  });

  describe('Template', () => {
    it('should display error message when errorMessage is set', () => {
      getComponentAny().errorMessage.set('Test error message');
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('.bg-red-50'));

      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.textContent).toContain('Test error message');
    });

    it('should disable submit button when form is invalid', () => {
      getComponentAny().loginForm.setValue({ email: '', password: '' });
      fixture.detectChanges();

      const pButton = fixture.debugElement.query(By.css('p-button'));
      expect(pButton.componentInstance.disabled).toBe(true);
    });

    it('should show loading state when submitting', () => {
      getComponentAny().isLoading.set(true);
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('p-button'));
      expect(button.componentInstance.loading).toBe(true);
    });
  });
});

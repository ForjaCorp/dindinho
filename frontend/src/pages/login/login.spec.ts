/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ReactiveFormsModule } from '@angular/forms';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}
import { provideRouter, ActivatedRoute } from '@angular/router';
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
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  const mockUser: UserState = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'VIEWER',
  };

  const mockToken = 'test-token';

  beforeEach(async () => {
    TestBed.resetTestingModule();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

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
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line
  const getComponentAny = () => component as any;

  it('deve inicializar o formulário com campos vazios', () => {
    expect(getComponentAny().loginForm.get('email')?.value).toBe('');
    expect(getComponentAny().loginForm.get('password')?.value).toBe('');
  });

  it('deve preencher o e-mail se estiver presente nos queryParams', async () => {
    // Para este teste, precisamos de um ActivatedRoute com queryParams
    TestBed.resetTestingModule();
    const authServiceSpy = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: LoginComponent }]),
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'email' ? 'preenchido@email.com' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    const newFixture = TestBed.createComponent(LoginComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((newComponent as any).loginForm.get('email')?.value).toBe('preenchido@email.com');
  });

  it('deve tornar o campo de email obrigatório', () => {
    const emailControl = getComponentAny().loginForm.get('email');
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBe(true);

    emailControl?.setValue('test@example.com');
    expect(emailControl?.hasError('required')).toBe(false);
  });

  it('deve validar o formato do email', () => {
    const emailControl = getComponentAny().loginForm.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);

    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBe(false);
  });

  it('deve tornar o campo de senha obrigatório', () => {
    const passwordControl = getComponentAny().loginForm.get('password');
    passwordControl?.setValue('');
    expect(passwordControl?.hasError('required')).toBe(true);

    passwordControl?.setValue('password123');
    expect(passwordControl?.hasError('required')).toBe(false);
  });

  describe('onSubmit()', () => {
    it('não deve chamar authService.login se o formulário for inválido', () => {
      getComponentAny().loginForm.setValue({ email: '', password: '' });

      component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('deve definir o estado de carregamento como true ao enviar o formulário', () => {
      getComponentAny().loginForm.setValue({ email: 'test@example.com', password: 'password123' });
      // eslint-disable-next-line
      const loginSubject = new Subject<any>();
      vi.spyOn(authService, 'login').mockReturnValue(loginSubject);
      component.onSubmit();
      expect(getComponentAny().isLoading()).toBe(true);
      loginSubject.complete();
    });

    it('deve chamar authService.login com os valores do formulário quando for válido', () => {
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

    it('deve definir mensagem de erro em caso de erro 401', () => {
      getComponentAny().loginForm.setValue({ email: 'test@example.com', password: 'wrong' });
      const errorResponse = { status: 401 };
      vi.spyOn(authService, 'login').mockReturnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(getComponentAny().errorMessage()).toBe('Email ou senha incorretos.');
      expect(getComponentAny().isLoading()).toBe(false);
    });

    it('deve definir mensagem de erro em caso de erro de conexão', () => {
      getComponentAny().loginForm.setValue({ email: 'test@example.com', password: 'password' });
      const errorResponse = { status: 0 };
      vi.spyOn(authService, 'login').mockReturnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(getComponentAny().errorMessage()).toContain('Não foi possível conectar');
    });

    it('deve definir mensagem de erro genérica para outros erros', () => {
      getComponentAny().loginForm.setValue({ email: 'test@example.com', password: 'password' });
      const errorResponse = { status: 500 };
      vi.spyOn(authService, 'login').mockReturnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(getComponentAny().errorMessage()).toContain('Ocorreu um erro');
    });
  });

  describe('isFieldInvalid()', () => {
    it('deve retornar false para campos puros e não tocados', () => {
      const fieldName = 'email';
      const result = component.isFieldInvalid(fieldName);
      expect(result).toBe(false);
    });

    it('deve retornar true para campos inválidos e tocados', () => {
      const fieldName = 'email';
      const control = getComponentAny().loginForm.get(fieldName);
      control?.markAsTouched();
      control?.setValue('');

      const result = component.isFieldInvalid(fieldName);

      expect(result).toBe(true);
    });
  });

  describe('Template', () => {
    it('deve exibir mensagem de erro quando errorMessage estiver definido', () => {
      getComponentAny().errorMessage.set('Mensagem de erro de teste');
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(
        By.css('[data-testid="login-error-message"]'),
      );

      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.textContent).toContain('Mensagem de erro de teste');
    });

    it('deve desabilitar o botão de envio quando o formulário for inválido', () => {
      getComponentAny().loginForm.setValue({ email: '', password: '' });
      fixture.detectChanges();

      const pButton = fixture.debugElement.query(By.css('[data-testid="login-submit-button"]'));
      expect(pButton.componentInstance.disabled).toBe(true);
    });

    it('deve mostrar estado de carregamento ao enviar', () => {
      getComponentAny().isLoading.set(true);
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('[data-testid="login-submit-button"]'));
      expect(button.componentInstance.loading).toBe(true);
    });
  });
});

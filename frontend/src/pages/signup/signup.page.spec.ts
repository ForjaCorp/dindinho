/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { SignupPage } from './signup.page';
import { AuthService } from '../../app/services/auth.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { By } from '@angular/platform-browser';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('SignupPage', () => {
  let component: SignupPage;
  let fixture: ComponentFixture<SignupPage>;

  const authServiceMock = {
    signup: vi.fn(),
    joinWaitlist: vi.fn(),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    authServiceMock.signup.mockReset();
    authServiceMock.joinWaitlist.mockReset();

    // Mock navigator.vibrate
    if (typeof navigator !== 'undefined') {
      if (!navigator.vibrate) {
        Object.defineProperty(navigator, 'vibrate', {
          value: vi.fn(),
          writable: true,
          configurable: true,
        });
      }
      vi.spyOn(navigator, 'vibrate').mockImplementation(() => true);
    }
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
    const page = fixture.debugElement.query(By.css('[data-testid="signup-page"]'));
    expect(page).toBeTruthy();
  });

  it('deve validar formulário inválido inicialmente', () => {
    expect(component['signupForm'].valid).toBe(false);
    const submitBtn = fixture.debugElement.query(By.css('[data-testid="signup-submit-button"]'));
    expect(submitBtn.componentInstance.disabled).toBe(true);
  });

  it('deve validar email incorreto', () => {
    const emailControl = component['signupForm'].get('email');

    emailControl?.setValue('email-invalido');
    emailControl?.markAsTouched();
    fixture.detectChanges();

    expect(emailControl?.valid).toBe(false);
    expect(emailControl?.hasError('email')).toBe(true);

    const errorMsg = fixture.debugElement.query(By.css('#email-error'));
    expect(errorMsg).toBeTruthy();
    expect(errorMsg.nativeElement.textContent).toContain('Email inválido');
  });

  it('deve validar senha fraca', () => {
    const passwordControl = component['signupForm'].get('password');
    passwordControl?.setValue('12345678'); // Sem maiúscula/especial
    expect(passwordControl?.valid).toBe(false);
  });

  it('deve aceitar senha forte', () => {
    const passwordControl = component['signupForm'].get('password');
    passwordControl?.setValue('SenhaForte1@');
    expect(passwordControl?.valid).toBe(true);
  });

  it('deve validar telefone vazio', () => {
    const phoneControl = component['signupForm'].get('phone');
    expect(phoneControl?.valid).toBe(false);
  });

  it('deve formatar telefone ao digitar (br)', () => {
    const phoneInput = fixture.debugElement.query(By.css('[data-testid="signup-phone-input"]'));
    phoneInput.nativeElement.value = '11999999999';
    phoneInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // AsYouType (BR) formata como (11) 99999-9999
    expect(phoneInput.nativeElement.value).toContain('(');
    expect(component['signupForm'].get('phone')?.value).toBe(phoneInput.nativeElement.value);
  });

  it('deve chamar signup com sucesso', () => {
    authServiceMock.signup.mockReturnValue(
      of({
        id: '1',
        name: 'Teste',
        email: 'teste@email.com',
        phone: '+5511999999999',
        createdAt: new Date(),
      }),
    );

    component['signupForm'].patchValue({
      name: 'Teste Silva',
      email: 'teste@email.com',
      countryCode: 'BR',
      phone: '11999999999',
      password: 'SenhaForte1@',
      acceptedTerms: true,
    });
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const form = fixture.debugElement.query(By.css('[data-testid="signup-form"]'));
    form.triggerEventHandler('ngSubmit', null);

    expect(authServiceMock.signup).toHaveBeenCalled();
    const args = authServiceMock.signup.mock.calls[0][0];
    expect(args.email).toBe('teste@email.com');
    expect(args.phone).toBe('+5511999999999'); // E.164
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      state: { email: 'teste@email.com' },
    });
    expect(navigator.vibrate).toHaveBeenCalledWith(100);
  });

  it('deve exibir erro se email já existe', () => {
    const errorResponse = { status: 409 };
    authServiceMock.signup.mockReturnValue(throwError(() => errorResponse));

    component['signupForm'].patchValue({
      name: 'Teste Silva',
      email: 'existente@email.com',
      countryCode: 'BR',
      phone: '11999999999',
      password: 'SenhaForte1@',
      acceptedTerms: true,
    });
    fixture.detectChanges();

    component.onSubmit();
    fixture.detectChanges();

    expect(authServiceMock.signup).toHaveBeenCalled();
    expect(component['errorMessage']()).toBe('Email já cadastrado.');
    expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('deve exibir botão da waitlist quando receber 403 (não convidado)', () => {
    const errorResponse = { status: 403 };
    authServiceMock.signup.mockReturnValue(throwError(() => errorResponse));

    component['signupForm'].patchValue({
      name: 'Teste',
      email: 'nao-convidado@email.com',
      countryCode: 'BR',
      phone: '11999999999',
      password: 'SenhaForte1@',
      acceptedTerms: true,
    });
    fixture.detectChanges();

    component.onSubmit();
    fixture.detectChanges();

    expect(component['errorMessage']()).toContain('Cadastro não permitido');
    expect(component['showWaitlistButton']()).toBe(true);

    const waitlistBtn = fixture.debugElement.query(By.css('[data-testid="waitlist-button"]'));
    expect(waitlistBtn).toBeTruthy();
  });

  it('deve entrar na waitlist com sucesso', () => {
    authServiceMock.joinWaitlist.mockReturnValue(of({ message: 'Sucesso' }));

    component['signupForm'].patchValue({
      name: 'Teste',
      email: 'waitlist@email.com',
      countryCode: 'BR',
      phone: '11999999999',
    });
    fixture.detectChanges();

    component.onJoinWaitlist();
    fixture.detectChanges();

    expect(authServiceMock.joinWaitlist).toHaveBeenCalled();
    expect(component['waitlistSuccess']()).toBe(true);
    expect(component['errorMessage']()).toBeNull();
    expect(navigator.vibrate).toHaveBeenCalledWith(100);
  });

  it('deve exibir erro 409 ao entrar na waitlist', () => {
    const errorResponse = { status: 409 };
    authServiceMock.joinWaitlist.mockReturnValue(throwError(() => errorResponse));

    component['signupForm'].patchValue({
      name: 'Teste',
      email: 'ja-na-lista@email.com',
      countryCode: 'BR',
      phone: '11999999999',
    });
    fixture.detectChanges();

    component.onJoinWaitlist();
    fixture.detectChanges();

    expect(component['errorMessage']()).toBe('Email já está na lista de espera.');
    expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('deve limpar mensagem de erro ao alterar o formulário', () => {
    component['errorMessage'].set('Erro de teste');
    fixture.detectChanges();

    component['signupForm'].patchValue({ name: 'Novo Nome' });
    fixture.detectChanges();

    expect(component['errorMessage']()).toBeNull();
  });

  it('deve validar telefone inválido na submissão', () => {
    component['signupForm'].patchValue({
      name: 'Teste',
      email: 'teste@email.com',
      countryCode: 'BR',
      phone: '123', // Inválido
      password: 'SenhaForte1@',
      acceptedTerms: true,
    });
    fixture.detectChanges();

    component.onSubmit();
    fixture.detectChanges();

    expect(component['signupForm'].hasError('phoneInvalid')).toBe(true);
    expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('deve marcar todos os campos como tocados se o formulário for inválido', () => {
    const markAllAsTouchedSpy = vi.spyOn(component['signupForm'], 'markAllAsTouched');

    component.onSubmit();

    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('deve tratar erro genérico no signup', () => {
    const errorResponse = { status: 500 };
    authServiceMock.signup.mockReturnValue(throwError(() => errorResponse));

    component['signupForm'].patchValue({
      name: 'Teste Silva',
      email: 'erro@email.com',
      countryCode: 'BR',
      phone: '11999999999',
      password: 'SenhaForte1@',
      acceptedTerms: true,
    });
    fixture.detectChanges();

    component.onSubmit();
    fixture.detectChanges();

    expect(component['errorMessage']()).toBe('Erro ao criar conta. Tente novamente.');
  });

  it('deve tratar erro genérico na waitlist', () => {
    const errorResponse = { status: 500 };
    authServiceMock.joinWaitlist.mockReturnValue(throwError(() => errorResponse));

    component['signupForm'].patchValue({
      name: 'Teste',
      email: 'erro-waitlist@email.com',
      countryCode: 'BR',
      phone: '11999999999',
    });
    fixture.detectChanges();

    component.onJoinWaitlist();
    fixture.detectChanges();

    expect(component['errorMessage']()).toBe('Erro ao solicitar convite. Tente novamente.');
  });
});

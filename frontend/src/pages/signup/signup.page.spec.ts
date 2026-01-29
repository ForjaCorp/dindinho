import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignupPage } from './signup.page';
import { AuthService } from '../../app/services/auth.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('SignupPage', () => {
  let component: SignupPage;
  let fixture: ComponentFixture<SignupPage>;

  const authServiceMock = {
    signup: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        provideNoopAnimations(),
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
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve validar formulário inválido inicialmente', () => {
    expect(component['signupForm'].valid).toBe(false);
  });

  it('deve validar email incorreto', () => {
    const emailControl = component['signupForm'].get('email');
    emailControl?.setValue('email-invalido');
    expect(emailControl?.valid).toBe(false);
    expect(emailControl?.hasError('email')).toBe(true);
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
    const input = document.createElement('input');
    input.value = '11999999999';
    const event = { target: input } as unknown as Event;

    component.onPhoneInput(event);

    // AsYouType (BR) formata como (11) 99999-9999
    expect(input.value).toContain('(');
    expect(component['signupForm'].get('phone')?.value).toBe(input.value);
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
    });

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onSubmit();

    expect(authServiceMock.signup).toHaveBeenCalled();
    const args = authServiceMock.signup.mock.calls[0][0];
    expect(args.email).toBe('teste@email.com');
    expect(args.phone).toBe('+5511999999999'); // E.164
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
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
    });

    component.onSubmit();

    expect(authServiceMock.signup).toHaveBeenCalled();
    expect(component['errorMessage']()).toBe('Email já cadastrado.');
  });
});

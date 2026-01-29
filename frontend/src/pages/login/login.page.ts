import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AppError } from '../../app/models/error.model';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../app/services/auth.service';

/**
 * Interface para os controles do formulário de login
 */
interface LoginFormControls {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}

/**
 * Interface para o estado de navegação vindo do Signup
 */
export interface LoginNavigationState {
  email: string;
}

/**
 * Interface para os valores do formulário de login
 */
interface LoginFormValues {
  email: string | null;
  password: string | null;
}

/**
 * Componente de Login
 *
 * @description
 * Componente responsável pela autenticação do usuário no sistema.
 * Permite que os usuários façam login com email e senha.
 *
 * @example
 * ```html
 * <app-login></app-login>
 * ```
 *
 * @selector app-login
 */
@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    CardModule,
    PasswordModule,
  ],
  template: `
    <div
      data-testid="login-page"
      class="min-h-screen flex items-center justify-center bg-slate-50 p-4"
    >
      <p-card data-testid="login-card" styleClass="w-full max-w-md shadow-lg !rounded-2xl">
        <div class="flex flex-col items-center mb-6">
          <div
            data-testid="login-logo"
            class="w-12 h-12 bg-linear-to-tr from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md mb-3"
          >
            D
          </div>
          <h1 class="text-2xl font-bold text-slate-800">Bem-vindo de volta!</h1>
          <p class="text-slate-500 text-sm">Acesse sua conta Dindinho</p>
        </div>

        <form
          data-testid="login-form"
          [formGroup]="loginForm"
          (ngSubmit)="onSubmit()"
          class="flex flex-col gap-4"
        >
          <div class="flex flex-col gap-2">
            <label for="email" class="text-sm font-medium text-slate-700">Email</label>
            <input
              pInputText
              data-testid="login-email-input"
              id="email"
              formControlName="email"
              placeholder="seu@email.com"
              class="w-full"
              [class]="isFieldInvalid('email') ? 'ng-invalid ng-dirty w-full' : 'w-full'"
            />
            @if (isFieldInvalid('email')) {
              <small class="text-red-500">Email inválido</small>
            }
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="text-sm font-medium text-slate-700">Senha</label>
            <p-password
              data-testid="login-password-input"
              id="password"
              formControlName="password"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              placeholder="••••••••"
            />
            @if (isFieldInvalid('password')) {
              <small class="text-red-500">Senha é obrigatória</small>
            }
          </div>

          @if (errorMessage()) {
            <div
              data-testid="login-error-message"
              class="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100"
            >
              {{ errorMessage() }}
            </div>
          }

          <p-button
            data-testid="login-submit-button"
            type="submit"
            label="Entrar"
            [loading]="isLoading()"
            [disabled]="loginForm.invalid"
            styleClass="w-full !bg-emerald-600 hover:!bg-emerald-700 !border-0"
          />

          <div data-testid="signup-link" class="text-center text-sm text-slate-500">
            Ainda não tem conta?
            <a routerLink="/signup" class="text-emerald-600 font-medium hover:underline"
              >Crie agora</a
            >
          </div>
        </form>
      </p-card>
    </div>
  `,
})
export class LoginComponent {
  /** Serviço para construção de formulários reativos */
  private fb = inject(FormBuilder);

  /** Serviço de autenticação */
  private authService = inject(AuthService);

  private router = inject(Router);

  constructor() {
    const navigation = this.router.currentNavigation ? this.router.currentNavigation() : null;
    const state = navigation?.extras.state as LoginNavigationState | undefined;

    if (state?.email) {
      this.loginForm.controls.email.setValue(state.email);
    }
  }

  /** Estado de carregamento do formulário */
  protected isLoading = signal(false);

  /** Mensagem de erro a ser exibida */
  protected errorMessage = signal<string | null>(null);

  /**
   * Formulário de login
   */
  protected loginForm: FormGroup<LoginFormControls> = this.fb.group<LoginFormControls>({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  /**
   * Verifica se um campo do formulário é inválido e foi tocado
   * @param {string} field - Nome do campo a ser verificado
   * @returns {boolean} true se o campo for inválido e tiver sido tocado, false caso contrário
   */
  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Manipulador de envio do formulário
   * @description
   * 1. Valida o formulário
   * 2. Envia as credenciais para autenticação
   * 3. Gerencia estados de carregamento e erros
   */
  onSubmit(): void {
    // Retorna se o formulário for inválido
    if (this.loginForm.invalid) return;

    // Inicia o estado de carregamento
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Obtém os valores do formulário com tipagem segura
    const formValue = this.loginForm.value as LoginFormValues;
    const { email, password } = formValue;

    // Chama o serviço de autenticação
    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        // O redirecionamento é feito no AuthService após o login bem-sucedido
        this.isLoading.set(false);
      },
      error: (err: AppError) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}

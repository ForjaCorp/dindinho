import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  AbstractControl,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  FormControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '../../app/services/auth.service';
import parsePhoneNumberFromString, {
  AsYouType,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';
import type { CountryCode, PhoneNumber } from 'libphonenumber-js';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

interface SignupFormControls {
  name: FormControl<string>;
  email: FormControl<string>;
  countryCode: FormControl<CountryCode>;
  phone: FormControl<string>;
  password: FormControl<string>;
  acceptedTerms: FormControl<boolean>;
}
interface CountryOption {
  name: string;
  code: CountryCode;
  dialCode: string;
}

const phoneValidator = (control: AbstractControl): ValidationErrors | null => {
  const group = control as FormGroup<SignupFormControls>;
  const phone = group.controls.phone.value;
  const countryCode = group.controls.countryCode.value;

  if (!phone || !countryCode) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(phone, countryCode);
  return parsed && parsed.isValid() ? null : { phoneInvalid: true };
};

/**
 * Página de cadastro de usuários.
 * Gerencia a criação de conta e o fluxo de lista de espera (waitlist).
 * @class SignupPage
 */
@Component({
  selector: 'app-signup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NgOptimizedImage,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    CardModule,
    PasswordModule,
    SelectModule,
    CheckboxModule,
  ],
  host: {
    class: 'block',
  },
  template: `
    <div
      data-testid="signup-page"
      class="min-h-screen flex items-center justify-center bg-slate-50 p-4"
    >
      <p-card styleClass="w-full max-w-md shadow-lg !rounded-2xl">
        <div class="flex flex-col items-center mb-6">
          <div
            data-testid="signup-logo"
            class="w-12 h-12 bg-linear-to-tr from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md mb-3"
          >
            D
          </div>
          <h1 class="text-2xl font-bold text-slate-800">
            {{ waitlistSuccess() ? 'Solicitação Enviada!' : 'Crie sua conta' }}
          </h1>
          <p class="text-slate-500 text-sm">
            {{
              waitlistSuccess()
                ? 'Entraremos em contato em breve.'
                : 'Comece a controlar suas finanças hoje'
            }}
          </p>
        </div>

        @if (waitlistSuccess()) {
          <div class="flex flex-col items-center gap-6 py-4">
            <div
              class="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center"
            >
              <i class="pi pi-check text-4xl"></i>
            </div>
            <p class="text-center text-slate-600">
              Recebemos seu interesse! Assim que uma vaga na nossa lista de convidados for liberada
              para
              <strong>{{ signupForm.controls.email.value }}</strong
              >, você receberá um e-mail com as instruções.
            </p>
            <p-button
              label="Voltar para o Login"
              styleClass="w-full !bg-indigo-600 hover:!bg-indigo-700 !border-0"
              routerLink="/login"
            />
          </div>
        } @else {
          <form
            data-testid="signup-form"
            [formGroup]="signupForm"
            (ngSubmit)="onSubmit()"
            class="flex flex-col gap-4"
          >
            <div class="flex flex-col gap-2">
              <label for="name" class="text-sm font-medium text-slate-700">Nome Completo</label>
              <input
                data-testid="signup-name-input"
                pInputText
                id="name"
                formControlName="name"
                placeholder="Seu nome"
                class="w-full"
                [class]="isFieldInvalid('name') ? 'ng-invalid ng-dirty w-full' : 'w-full'"
                autocomplete="name"
                [attr.aria-describedby]="isFieldInvalid('name') ? 'name-error' : null"
              />
              @if (isFieldInvalid('name')) {
                <small id="name-error" class="text-red-500" aria-live="polite"
                  >Nome deve ter pelo menos 2 caracteres</small
                >
              }
            </div>

            <div class="flex flex-col gap-2">
              <label for="email" class="text-sm font-medium text-slate-700">Email</label>
              <input
                data-testid="signup-email-input"
                pInputText
                id="email"
                formControlName="email"
                placeholder="seu@email.com"
                class="w-full"
                [class]="isFieldInvalid('email') ? 'ng-invalid ng-dirty w-full' : 'w-full'"
                autocomplete="email"
                inputmode="email"
                [attr.aria-describedby]="isFieldInvalid('email') ? 'email-error' : null"
              />
              @if (isFieldInvalid('email')) {
                <small id="email-error" class="text-red-500" aria-live="polite"
                  >Email inválido</small
                >
              }
            </div>

            <div class="flex flex-col gap-2">
              <label for="phone" class="text-sm font-medium text-slate-700">Celular</label>
              <div class="flex gap-2">
                <p-select
                  data-testid="signup-country-select"
                  [options]="countries"
                  formControlName="countryCode"
                  optionLabel="name"
                  optionValue="code"
                  [filter]="true"
                  filterBy="name,dialCode"
                  styleClass="w-[110px]"
                  [panelStyle]="{ width: '250px' }"
                  appendTo="body"
                  aria-label="Código do país"
                >
                  <ng-template pTemplate="selectedItem" let-selectedOption>
                    @if (selectedOption) {
                      <div class="flex items-center gap-2">
                        <img
                          [ngSrc]="
                            'https://flagcdn.com/w20/' + selectedOption.code.toLowerCase() + '.png'
                          "
                          width="20"
                          height="15"
                          [class]="'flag flag-' + selectedOption.code.toLowerCase()"
                          [alt]="selectedOption.name"
                        />
                        <div>{{ selectedOption.dialCode }}</div>
                      </div>
                    }
                  </ng-template>
                  <ng-template let-country pTemplate="item">
                    <div class="flex items-center gap-2">
                      <img
                        [ngSrc]="'https://flagcdn.com/w20/' + country.code.toLowerCase() + '.png'"
                        width="20"
                        height="15"
                        [class]="'flag flag-' + country.code.toLowerCase()"
                        [alt]="country.name"
                      />
                      <div>{{ country.name }}</div>
                      <div class="text-slate-400 text-xs ml-auto">{{ country.dialCode }}</div>
                    </div>
                  </ng-template>
                </p-select>

                <input
                  data-testid="signup-phone-input"
                  pInputText
                  id="phone"
                  formControlName="phone"
                  placeholder="(99) 99999-9999"
                  class="flex-1"
                  [class]="isFieldInvalid('phone') ? 'ng-invalid ng-dirty w-full' : 'w-full'"
                  (input)="onPhoneInput($event)"
                  autocomplete="tel-national"
                  inputmode="tel"
                  [attr.aria-describedby]="isFieldInvalid('phone') ? 'phone-error' : null"
                />
              </div>
              @if (isFieldInvalid('phone')) {
                <small id="phone-error" class="text-red-500" aria-live="polite"
                  >Telefone inválido</small
                >
              }
            </div>

            <div class="flex flex-col gap-2">
              <label for="password" class="text-sm font-medium text-slate-700">Senha</label>
              <p-password
                data-testid="signup-password-input"
                id="password"
                formControlName="password"
                [toggleMask]="true"
                styleClass="w-full"
                inputStyleClass="w-full"
                placeholder="Mínimo 6 caracteres"
                promptLabel="Digite uma senha forte"
                weakLabel="Fraca"
                mediumLabel="Média"
                strongLabel="Forte"
                autocomplete="new-password"
                [attr.aria-describedby]="'password-requirements'"
              >
                <ng-template pTemplate="footer">
                  <div id="password-requirements" class="mt-3">
                    <p class="text-xs font-semibold text-slate-600 mb-2">Requisitos:</p>
                    <ul class="flex flex-col gap-1.5 list-none p-0 m-0">
                      @for (req of passwordRequirements(); track req.label) {
                        <li class="flex items-center gap-2 text-xs transition-colors duration-200">
                          <i
                            [class]="
                              req.met
                                ? 'pi pi-check-circle text-emerald-500'
                                : 'pi pi-circle text-slate-300'
                            "
                          ></i>
                          <span [class]="req.met ? 'text-emerald-700' : 'text-slate-500'">
                            {{ req.label }}
                          </span>
                        </li>
                      }
                    </ul>
                  </div>
                </ng-template>
              </p-password>
              @if (isFieldInvalid('password')) {
                <small class="text-red-500" aria-live="polite"
                  >Senha não atende aos requisitos</small
                >
              }
            </div>

            <div class="flex items-start gap-2 mt-2">
              <p-checkbox
                formControlName="acceptedTerms"
                [binary]="true"
                inputId="acceptedTerms"
                data-testid="signup-terms-checkbox"
              />
              <label for="acceptedTerms" class="text-xs text-slate-600 cursor-pointer">
                Eu aceito os
                <a href="#" class="text-emerald-600 hover:underline">Termos de Uso</a> e a
                <a href="#" class="text-emerald-600 hover:underline">Política de Privacidade</a>.
              </label>
            </div>
            @if (isFieldInvalid('acceptedTerms')) {
              <small class="text-red-500 text-xs" aria-live="polite"
                >Você deve aceitar os termos de uso</small
              >
            }

            <div aria-live="assertive">
              @if (errorMessage()) {
                <div
                  [class]="
                    showWaitlistButton()
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100 p-4 rounded-xl border flex flex-col gap-3'
                      : 'bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex flex-col gap-3'
                  "
                >
                  <div class="flex gap-2">
                    <i
                      [class]="
                        showWaitlistButton()
                          ? 'pi pi-info-circle text-lg'
                          : 'pi pi-exclamation-circle text-lg'
                      "
                    ></i>
                    <span>{{ errorMessage() }}</span>
                  </div>

                  @if (showWaitlistButton()) {
                    <p-button
                      data-testid="waitlist-button"
                      label="Solicitar Convite"
                      icon="pi pi-star"
                      styleClass="w-full !bg-indigo-600 hover:!bg-indigo-700 !border-0 !py-2 shadow-sm transition-all"
                      (onClick)="onJoinWaitlist()"
                    />
                  }
                </div>
              }
            </div>

            <p-button
              data-testid="signup-submit-button"
              type="submit"
              label="Criar Conta"
              [loading]="isLoading()"
              [disabled]="signupForm.invalid"
              styleClass="w-full !bg-emerald-600 hover:!bg-emerald-700 !border-0"
            />

            <div class="text-center text-sm text-slate-500">
              Já tem uma conta?
              <a routerLink="/login" class="text-emerald-600 font-medium hover:underline">Entrar</a>
            </div>
          </form>
        }
      </p-card>
    </div>
  `,
})
export class SignupPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected showWaitlistButton = signal(false);
  protected waitlistSuccess = signal(false);

  protected signupForm: FormGroup<SignupFormControls> = this.fb.group<SignupFormControls>(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      countryCode: new FormControl('BR', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      phone: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(6),
          Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/),
        ],
      }),
      acceptedTerms: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue],
      }),
    },
    { validators: [phoneValidator] },
  );

  /**
   * Sinal reativo para o valor da senha.
   * @private
   */
  private passwordValue = toSignal(this.signupForm.controls.password.valueChanges, {
    initialValue: '',
  });

  /**
   * Checklist dinâmica de requisitos da senha baseada no sinal do formulário.
   * @protected
   */
  protected passwordRequirements = computed(() => {
    const password = this.passwordValue() || '';
    return [
      { label: 'Pelo menos 6 caracteres', met: password.length >= 6 },
      { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
      { label: 'Uma letra minúscula', met: /[a-z]/.test(password) },
      { label: 'Um número', met: /[0-9]/.test(password) },
      { label: 'Um caractere especial', met: /[^A-Za-z0-9]/.test(password) },
    ];
  });

  private readonly countryDisplayNames =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames(['pt-BR'], { type: 'region' })
      : null;

  protected readonly countries: CountryOption[] = getCountries()
    .map((code) => ({
      name: this.countryDisplayNames?.of(code) ?? code,
      code,
      dialCode: `+${getCountryCallingCode(code)}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  constructor() {
    this.signupForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });
  }

  /**
   * Verifica se um campo do formulário está inválido.
   * @param {keyof SignupFormControls} field - Nome do campo
   * @returns {boolean} True se o campo estiver inválido e tocado/sujo
   */
  isFieldInvalid(field: keyof SignupFormControls): boolean {
    const control = this.signupForm.controls[field];
    if (field === 'phone') {
      return (
        (control.invalid || this.signupForm.hasError('phoneInvalid')) &&
        (control.dirty || control.touched)
      );
    }
    return control.invalid && (control.dirty || control.touched);
  }

  /**
   * Converte uma string de telefone para o formato internacional.
   * @private
   * @param {string} phone - Telefone em formato texto
   * @param {CountryCode} countryCode - Código do país (ISO)
   * @returns {PhoneNumber | null} Objeto de telefone parseado ou null
   */
  private parsePhone(phone: string, countryCode: CountryCode): PhoneNumber | null {
    const parsed = parsePhoneNumberFromString(phone, countryCode);
    if (!parsed || !parsed.isValid()) {
      return null;
    }
    return parsed;
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const countryCode = this.signupForm.controls.countryCode.value;

    if (input.value) {
      const asYouType = new AsYouType(countryCode);
      input.value = asYouType.input(input.value);
      this.signupForm.get('phone')?.setValue(input.value, { emitEvent: false });
    }
  }

  /**
   * Fornece feedback tátil através da API Vibration.
   * @param {'error' | 'success'} type - Tipo de feedback
   * @private
   */
  private vibrate(type: 'error' | 'success'): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'error') {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate(100);
      }
    }
  }

  /**
   * Processa a submissão do formulário de cadastro.
   */
  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.vibrate('error');
      return;
    }

    const { name, email, countryCode, phone, password, acceptedTerms } =
      this.signupForm.getRawValue();
    const parsed = this.parsePhone(phone, countryCode);

    if (!parsed) {
      this.signupForm.controls.phone.setErrors({
        ...(this.signupForm.controls.phone.errors ?? {}),
        phoneInvalid: true,
      });
      this.vibrate('error');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService
      .signup({
        name,
        email,
        phone: parsed.number,
        password,
        acceptedTerms,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.vibrate('success');
          this.router.navigate(['/login'], { queryParams: { email } });
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.vibrate('error');

          if (err?.status === 409) {
            this.errorMessage.set('Email já cadastrado.');
            return;
          }

          if (err?.status === 403) {
            this.errorMessage.set(
              'Cadastro não permitido. Seu email não está na lista de convidados.',
            );
            this.showWaitlistButton.set(true);
            return;
          }

          this.errorMessage.set('Erro ao criar conta. Tente novamente.');
        },
      });
  }

  /**
   * Solicita entrada na lista de espera caso o cadastro não seja permitido.
   */
  onJoinWaitlist(): void {
    const { name, email, countryCode, phone } = this.signupForm.getRawValue();
    const parsed = this.parsePhone(phone, countryCode);

    if (!parsed) return;

    this.isLoading.set(true);

    this.authService
      .joinWaitlist({
        name,
        email,
        phone: parsed.number,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.vibrate('success');
          this.errorMessage.set(null);
          this.showWaitlistButton.set(false);
          this.waitlistSuccess.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.vibrate('error');
          if (err?.status === 409) {
            this.errorMessage.set('Email já está na lista de espera.');
          } else {
            this.errorMessage.set('Erro ao solicitar convite. Tente novamente.');
          }
        },
      });
  }
}

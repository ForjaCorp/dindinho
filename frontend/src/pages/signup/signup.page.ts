import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
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
import { AuthService } from '../../app/services/auth.service';
import parsePhoneNumberFromString, {
  AsYouType,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';
import type { CountryCode, PhoneNumber } from 'libphonenumber-js';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface SignupFormControls {
  name: FormControl<string>;
  email: FormControl<string>;
  countryCode: FormControl<CountryCode>;
  phone: FormControl<string>;
  password: FormControl<string>;
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
            class="w-12 h-12 bg-linear-to-tr from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md mb-3"
          >
            D
          </div>
          <h1 class="text-2xl font-bold text-slate-800">Crie sua conta</h1>
          <p class="text-slate-500 text-sm">Comece a controlar suas finanças hoje</p>
        </div>

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
            />
            @if (isFieldInvalid('name')) {
              <small class="text-red-500">Nome deve ter pelo menos 2 caracteres</small>
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
            />
            @if (isFieldInvalid('email')) {
              <small class="text-red-500">Email inválido</small>
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
              />
            </div>
            @if (isFieldInvalid('phone')) {
              <small class="text-red-500">Telefone inválido</small>
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
            >
              <ng-template pTemplate="footer">
                <p class="mt-2 text-xs text-slate-500">Requisitos:</p>
                <ul class="pl-2 ml-2 mt-0 list-disc text-xs text-slate-500">
                  <li>Pelo menos 6 caracteres</li>
                  <li>Uma letra maiúscula</li>
                  <li>Uma letra minúscula</li>
                  <li>Um número</li>
                  <li>Um caractere especial</li>
                </ul>
              </ng-template>
            </p-password>
            @if (isFieldInvalid('password')) {
              <small class="text-red-500">Senha não atende aos requisitos</small>
            }
          </div>

          @if (errorMessage()) {
            <div
              class="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex flex-col gap-2"
            >
              <span>{{ errorMessage() }}</span>
              @if (showWaitlistButton()) {
                <p-button
                  data-testid="waitlist-button"
                  label="Solicitar Convite"
                  [text]="true"
                  styleClass="!p-0 !text-red-700 hover:!underline !justify-start !w-fit"
                  (onClick)="onJoinWaitlist()"
                />
              }
            </div>
          }

          <p-button
            data-testid="signup-submit-button"
            type="submit"
            label="Criar Conta"
            [loading]="isLoading()"
            [disabled]="signupForm.invalid"
            styleClass="w-full !bg-emerald-600 hover:!bg-emerald-700 !border-0"
          />

          <div class="text-center mt-4 text-sm text-slate-500">
            Já tem uma conta?
            <a routerLink="/login" class="text-emerald-600 font-medium hover:underline">Entrar</a>
          </div>
        </form>
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
    },
    { validators: [phoneValidator] },
  );

  constructor() {
    this.signupForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });
  }

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

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const { name, email, countryCode, phone, password } = this.signupForm.getRawValue();
    const parsed = this.parsePhone(phone, countryCode);

    if (!parsed) {
      this.signupForm.controls.phone.setErrors({
        ...(this.signupForm.controls.phone.errors ?? {}),
        phoneInvalid: true,
      });
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
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/login']);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);

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
        next: (res) => {
          this.isLoading.set(false);
          this.errorMessage.set(null);
          this.showWaitlistButton.set(false);
          // Opcional: Mostrar toast/mensagem de sucesso
          alert(res.message);
          this.router.navigate(['/login']);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          if (err?.status === 409) {
            this.errorMessage.set('Email já está na lista de espera.');
          } else {
            this.errorMessage.set('Erro ao solicitar convite. Tente novamente.');
          }
        },
      });
  }
}

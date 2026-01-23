import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ColorPickerModule } from 'primeng/colorpicker';
import { AccountService } from '../../services/account.service';
import { CreateAccountDTO } from '@dindinho/shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-create-account-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectButtonModule,
    ColorPickerModule,
  ],
  template: `
    <p-dialog
      [header]="isCredit() ? 'Novo Cartão' : 'Nova Conta'"
      [modal]="true"
      [(visible)]="visible"
      [style]="{ width: '95vw', maxWidth: '500px', maxHeight: '90vh' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="resetForm()"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto overflow-x-hidden px-1"
      >
        <div class="flex flex-col gap-2">
          <p-selectButton
            [options]="typeOptions"
            formControlName="type"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
            aria-label="Tipo de conta"
            [allowEmpty]="false"
            [unselectable]="true"
          />
        </div>

        <div class="flex flex-row gap-3 items-end">
          <div class="flex-1 flex flex-col gap-2 min-w-0">
            <label for="name" class="font-medium text-slate-700 text-sm">Nome</label>
            <input
              pInputText
              id="name"
              formControlName="name"
              placeholder="Ex: Conta Principal"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2 shrink-0">
            <label for="color" class="font-medium text-slate-700 text-sm">Cor</label>
            <p-colorPicker formControlName="color" appendTo="body" />
          </div>
        </div>

        @if (!isCredit()) {
          <div class="flex flex-col gap-2">
            <label for="initialBalance" class="text-sm font-medium text-slate-600">
              Saldo inicial (R$)
            </label>
            <p-inputNumber
              id="initialBalance"
              formControlName="initialBalance"
              mode="currency"
              currency="BRL"
              locale="pt-BR"
              placeholder="R$ 0,00"
              class="w-full"
            />
          </div>
        }

        @if (isCredit()) {
          <div
            class="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-3 sm:gap-4 animate-fade-in"
          >
            <div class="flex flex-col sm:flex-row gap-3">
              <div class="flex-1 flex flex-col gap-2">
                <label for="closingDay" class="text-sm font-medium text-slate-600"
                  >Dia Fechamento</label
                >
                <p-inputNumber
                  id="closingDay"
                  formControlName="closingDay"
                  [min]="1"
                  [max]="31"
                  [showButtons]="true"
                  buttonLayout="horizontal"
                  placeholder="10"
                  class="w-full"
                />
              </div>
              <div class="flex-1 flex flex-col gap-2">
                <label for="dueDay" class="text-sm font-medium text-slate-600"
                  >Dia Vencimento</label
                >
                <p-inputNumber
                  id="dueDay"
                  formControlName="dueDay"
                  [min]="1"
                  [max]="31"
                  [showButtons]="true"
                  buttonLayout="horizontal"
                  placeholder="15"
                  class="w-full"
                />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label for="limit" class="text-sm font-medium text-slate-600">Limite (R$)</label>
              <p-inputNumber
                id="limit"
                formControlName="limit"
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                placeholder="R$ 0,00"
                class="w-full"
              />
            </div>
          </div>
        }

        <div class="flex flex-row justify-end gap-3 mt-4 sticky bottom-0 bg-white pt-2">
          <p-button
            label="Cancelar"
            [text]="true"
            (onClick)="visible.set(false)"
            severity="secondary"
            class="sm:flex-initial"
          />
          <p-button
            label="Criar"
            type="submit"
            [loading]="accountService.isLoading()"
            [disabled]="form.invalid"
            icon="pi pi-check"
            class="sm:flex-initial"
          />
        </div>
      </form>
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep .p-selectbutton .p-button,
      :host ::ng-deep .p-selectbutton .p-togglebutton {
        width: 50%;
        font-size: 0.875rem;
      }
      :host ::ng-deep .p-selectbutton .p-togglebutton.p-togglebutton-checked,
      :host ::ng-deep .p-selectbutton .p-togglebutton.p-highlight {
        background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
        border-color: #10b981;
        color: #ffffff;
      }
      :host
        ::ng-deep
        .p-selectbutton
        .p-togglebutton.p-togglebutton-checked
        .p-togglebutton-content,
      :host ::ng-deep .p-selectbutton .p-togglebutton.p-togglebutton-checked .p-togglebutton-label,
      :host ::ng-deep .p-selectbutton .p-togglebutton.p-highlight .p-togglebutton-content,
      :host ::ng-deep .p-selectbutton .p-togglebutton.p-highlight .p-togglebutton-label {
        background: transparent;
        color: #ffffff;
      }
      :host ::ng-deep .p-inputnumber {
        width: 100%;
      }
      :host ::ng-deep .p-inputnumber-input {
        width: 100%;
      }
      :host ::ng-deep .p-colorpicker-preview {
        width: 42px;
        height: 42px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      @media (max-width: 640px) {
        :host ::ng-deep .p-dialog {
          margin: 1rem;
          max-width: calc(100vw - 2rem);
        }
      }
    `,
  ],
})
export class CreateAccountDialogComponent {
  private fb = inject(FormBuilder);
  protected accountService = inject(AccountService);
  private destroyRef = inject(DestroyRef); // Para limpar subscrições automaticamente

  // Controle de visibilidade
  visible = signal(false);

  // Opções para o SelectButton
  typeOptions = [
    { label: 'Conta / Dinheiro', value: 'STANDARD' },
    { label: 'Cartão de Crédito', value: 'CREDIT' },
  ];

  // Formulário Reativo
  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    color: ['#10b981', Validators.required],
    type: ['STANDARD', Validators.required],
    initialBalance: [0 as number],
    // Campos opcionais inicialmente
    closingDay: [null as number | null],
    dueDay: [null as number | null],
    limit: [null as number | null],
  });

  constructor() {
    // Efeito para monitorar mudanças no tipo e ajustar validadores
    this.form.controls.type.valueChanges.subscribe((type) => {
      const isCredit = type === 'CREDIT';
      const creditControls = ['closingDay', 'dueDay', 'limit'];

      creditControls.forEach((key) => {
        const control = this.form.get(key);
        if (isCredit) {
          control?.setValidators([Validators.required, Validators.min(1)]);
        } else {
          control?.clearValidators();
          control?.setValue(null);
        }
        control?.updateValueAndValidity();
      });

      if (isCredit) {
        this.form.controls.initialBalance.setValue(0);
      }
    });
  }

  // Helper para verificar se é crédito no template
  isCredit() {
    return this.form.controls.type.value === 'CREDIT';
  }

  // Método público para abrir o diálogo
  show() {
    this.visible.set(true);
  }

  showForType(type: 'STANDARD' | 'CREDIT') {
    this.visible.set(true);
    this.form.controls.type.setValue(type);
  }

  resetForm() {
    this.form.reset({
      name: '',
      color: '#10b981',
      type: 'STANDARD',
      initialBalance: 0,
      closingDay: null,
      dueDay: null,
      limit: null,
    });
  }

  /**
   * Envia o formulário para criar uma nova conta.
   *
   * @description
   * Valida o formulário, mapeia os dados para o DTO esperado pela API,
   * e utiliza o serviço para criar a conta. O diálogo só fecha em caso
   * de sucesso, permanecendo aberto para correção em caso de erro.
   *
   * @example
   * // O método é chamado automaticamente pelo submit do formulário
   * <form (ngSubmit)="onSubmit()">
   */
  onSubmit() {
    if (this.form.invalid) return;

    const formValue = this.form.value;

    // Mapeamento para o DTO da API
    const dto: CreateAccountDTO = {
      name: formValue.name!,
      color: formValue.color!,
      // Ícone baseado no tipo de conta
      icon: formValue.type === 'CREDIT' ? 'pi-credit-card' : 'pi-wallet',
      type: formValue.type as CreateAccountDTO['type'],
      ...(formValue.type === 'CREDIT'
        ? {
            closingDay: formValue.closingDay!,
            dueDay: formValue.dueDay!,
            limit: formValue.limit!,
            brand: 'Mastercard', // TODO: Permitir seleção pelo usuário
          }
        : {
            initialBalance:
              typeof formValue.initialBalance === 'number' &&
              Number.isFinite(formValue.initialBalance)
                ? formValue.initialBalance
                : 0,
          }),
    };

    // Limpa erros anteriores
    this.accountService.clearError();

    // Abordagem reativa com Observable retornado pelo serviço
    this.accountService
      .createAccount(dto)
      .pipe(takeUntilDestroyed(this.destroyRef)) // Boa prática: evita memory leak
      .subscribe({
        next: () => {
          // Sucesso: backend retornou 201 Created
          this.visible.set(false);
          this.resetForm();
          // TODO: Adicionar toast de sucesso
        },
        error: (err) => {
          // Erro: modal permanece aberto para correção
          // O serviço já atualizou o signal 'error' com mensagem detalhada
          console.error('Falha na criação capturada pelo componente:', err);
        },
      });
  }
}

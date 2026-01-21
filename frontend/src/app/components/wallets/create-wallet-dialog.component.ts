import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ColorPickerModule } from 'primeng/colorpicker';
import { WalletService } from '../../services/wallet.service';
import { CreateWalletDTO } from '@dindinho/shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-create-wallet-dialog',
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
      header="Nova Carteira"
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
        class="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto px-1"
      >
        <div class="flex flex-col gap-2">
          <p-selectButton
            [options]="typeOptions"
            formControlName="type"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
            aria-label="Tipo de carteira"
          />
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1 flex flex-col gap-2">
            <label for="name" class="font-medium text-slate-700 text-sm">Nome</label>
            <input
              pInputText
              id="name"
              formControlName="name"
              placeholder="Ex: Conta Principal"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2 sm:w-auto">
            <label for="color" class="font-medium text-slate-700 text-sm">Cor</label>
            <p-colorPicker formControlName="color" appendTo="body" />
          </div>
        </div>

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
                placeholder="0,00"
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
            [loading]="walletService.isLoading()"
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
      :host ::ng-deep .p-selectbutton .p-button {
        width: 50%;
        font-size: 0.875rem;
      }
      :host ::ng-deep .p-colorpicker-preview {
        width: 42px;
        height: 42px;
        border-radius: 8px;
      }
      @media (max-width: 640px) {
        :host ::ng-deep .p-dialog {
          margin: 1rem;
        }
        :host ::ng-deep .p-dialog-content {
          padding: 1rem;
        }
        :host ::ng-deep .p-selectbutton .p-button {
          font-size: 0.75rem;
          padding: 0.5rem;
        }
      }
    `,
  ],
})
export class CreateWalletDialogComponent {
  private fb = inject(FormBuilder);
  protected walletService = inject(WalletService);
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

  resetForm() {
    this.form.reset({
      name: '',
      color: '#10b981',
      type: 'STANDARD',
      closingDay: null,
      dueDay: null,
      limit: null,
    });
  }

  /**
   * Envia o formulário para criar uma nova carteira.
   *
   * @description
   * Valida o formulário, mapeia os dados para o DTO esperado pela API,
   * e utiliza o serviço para criar a carteira. O diálogo só fecha em caso
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
    const dto: CreateWalletDTO = {
      name: formValue.name!,
      color: formValue.color!,
      // Ícone baseado no tipo de carteira
      icon: formValue.type === 'CREDIT' ? 'pi-credit-card' : 'pi-wallet',
      type: formValue.type as CreateWalletDTO['type'],
      ...(formValue.type === 'CREDIT'
        ? {
            closingDay: formValue.closingDay!,
            dueDay: formValue.dueDay!,
            limit: formValue.limit!,
            brand: 'Mastercard', // TODO: Permitir seleção pelo usuário
          }
        : {}),
    };

    // Limpa erros anteriores
    this.walletService.clearError();

    // Abordagem reativa com Observable retornado pelo serviço
    this.walletService
      .createWallet(dto)
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

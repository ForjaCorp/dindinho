import { Component, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { InviteService } from '../../services/invite.service';
import { AccountService } from '../../services/account.service';
import { ResourcePermission } from '@dindinho/shared';
import { Clipboard } from '@angular/cdk/clipboard';

/**
 * Diálogo para compartilhar contas com outros usuários via convite.
 * @description Permite selecionar múltiplas contas, definir permissões e gerar link de convite.
 */
@Component({
  selector: 'app-share-account-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectButtonModule,
    MultiSelectModule,
    TooltipModule,
  ],
  template: `
    <p-dialog
      header="Compartilhar Carteira"
      [modal]="true"
      [(visible)]="visible"
      [dismissableMask]="true"
      [style]="{ width: '95vw', maxWidth: '500px' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="resetForm()"
      data-testid="share-account-dialog"
    >
      <div class="flex flex-col gap-4 mt-2">
        @if (!inviteLink()) {
          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            class="flex flex-col gap-4"
            data-testid="share-account-form"
          >
            <div class="flex flex-col gap-2">
              <label for="email" class="font-medium text-slate-700 text-sm"
                >E-mail do Colaborador</label
              >
              <input
                pInputText
                id="email"
                formControlName="email"
                placeholder="exemplo@email.com"
                class="w-full"
                data-testid="share-email-input"
              />
              <small class="text-slate-500"> O convite será vinculado a este e-mail. </small>
            </div>

            <div class="flex flex-col gap-2">
              <label for="accountIds" class="font-medium text-slate-700 text-sm"
                >Contas para Compartilhar</label
              >
              <p-multiSelect
                inputId="accountIds"
                [options]="accountOptions()"
                formControlName="accountIds"
                optionLabel="name"
                optionValue="id"
                placeholder="Selecione as contas"
                styleClass="w-full"
                display="chip"
                [showClear]="true"
                data-testid="share-accounts-select"
              >
                <ng-template let-account pTemplate="item">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" [style.backgroundColor]="account.color"></div>
                    <span>{{ account.name }}</span>
                  </div>
                </ng-template>
              </p-multiSelect>
            </div>

            <div class="flex flex-col gap-2">
              <label for="permission" class="font-medium text-slate-700 text-sm"
                >Nível de Permissão</label
              >
              <p-selectButton
                inputId="permission"
                [options]="permissionOptions"
                formControlName="permission"
                optionLabel="label"
                optionValue="value"
                styleClass="w-full"
                [allowEmpty]="false"
                data-testid="share-permission-select"
              />
              <div class="text-xs text-slate-500 mt-1 px-1">
                @if (form.get('permission')?.value === 'VIEWER') {
                  <p>
                    <strong>Visualizador:</strong> Pode ver transações e saldos, mas não pode criar
                    ou editar nada.
                  </p>
                } @else {
                  <p>
                    <strong>Editor:</strong> Pode criar, editar e excluir transações nestas contas.
                  </p>
                }
              </div>
            </div>

            <div class="flex flex-row justify-end gap-3 mt-4">
              <p-button
                label="Cancelar"
                [text]="true"
                (onClick)="visible.set(false)"
                severity="secondary"
                data-testid="cancel-share-button"
              />
              <p-button
                label="Gerar Link de Convite"
                type="submit"
                [loading]="inviteService.isLoading()"
                [disabled]="form.invalid"
                icon="pi pi-link"
                data-testid="submit-share-button"
              />
            </div>
          </form>
        } @else {
          <div class="flex flex-col gap-6 py-4 items-center text-center animate-fade-in">
            <div
              class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2"
            >
              <i class="pi pi-check text-3xl"></i>
            </div>

            <div class="flex flex-col gap-2">
              <h3 class="text-xl font-bold text-slate-800">Convite Criado!</h3>
              <p class="text-slate-600">
                Compartilhe o link abaixo com <strong>{{ form.get('email')?.value }}</strong>
              </p>
            </div>

            <div
              class="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3"
            >
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wider text-left">
                Link de Convite
              </div>
              <div class="flex gap-2">
                <input
                  pInputText
                  [value]="inviteLink()"
                  readonly
                  class="flex-1 bg-white font-mono text-sm"
                />
                <p-button
                  icon="pi pi-copy"
                  (onClick)="copyToClipboard()"
                  pTooltip="Copiar link"
                  tooltipPosition="top"
                  severity="secondary"
                  data-testid="copy-invite-link-button"
                />
              </div>
            </div>

            <p-button
              label="Fechar"
              [text]="true"
              (onClick)="visible.set(false)"
              class="mt-2"
              data-testid="close-invite-success-button"
            />
          </div>
        }
      </div>
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep .p-selectbutton .p-button {
        width: 50%;
      }
      :host ::ng-deep .p-multiselect {
        width: 100%;
      }
    `,
  ],
})
export class ShareAccountDialogComponent {
  private fb = inject(FormBuilder);
  protected inviteService = inject(InviteService);
  private accountService = inject(AccountService);
  private messageService = inject(MessageService);
  private clipboard = inject(Clipboard);

  visible = signal(false);
  inviteLink = signal<string | null>(null);

  permissionOptions = [
    { label: 'Visualizador', value: ResourcePermission.VIEWER },
    { label: 'Editor', value: ResourcePermission.EDITOR },
  ];

  // Filtra apenas contas onde o usuário é OWNER
  accountOptions = computed(() =>
    this.accountService.accounts().filter((acc) => acc.permission === ResourcePermission.OWNER),
  );

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    accountIds: [[] as string[], [Validators.required, Validators.minLength(1)]],
    permission: [ResourcePermission.VIEWER, Validators.required],
  });

  /**
   * Abre o diálogo para uma ou mais contas
   * @param accountIds IDs das contas pré-selecionadas
   */
  open(accountIds: string[] = []) {
    this.resetForm();
    this.form.patchValue({ accountIds });
    this.visible.set(true);
  }

  resetForm() {
    this.form.reset({
      email: '',
      accountIds: [],
      permission: ResourcePermission.VIEWER,
    });
    this.inviteLink.set(null);
  }

  /**
   * Submete o formulário para criar um novo convite.
   */
  onSubmit() {
    if (this.form.invalid) return;

    const { email, accountIds, permission } = this.form.value;

    if (!email || !accountIds || !permission) return;

    this.inviteService
      .createInvite({
        email,
        accounts: accountIds.map((id) => ({
          accountId: id,
          permission: permission as ResourcePermission,
        })),
        expiresInDays: 7,
      })
      .subscribe({
        next: (invite) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Convite gerado com sucesso!',
          });

          // Gera o link de convite com o novo token seguro
          const baseUrl = window.location.origin;
          this.inviteLink.set(`${baseUrl}/invite/accept?token=${invite.token}`);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: err.error?.message || 'Erro ao gerar convite',
          });
        },
      });
  }

  /**
   * Copia o link de convite para a área de transferência.
   */
  copyToClipboard() {
    const link = this.inviteLink();
    if (link) {
      this.clipboard.copy(link);
      this.messageService.add({
        severity: 'info',
        summary: 'Copiado',
        detail: 'Link copiado para a área de transferência',
      });
    }
  }
}

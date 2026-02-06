import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InviteService } from '../../app/services/invite.service';
import { InviteStatus } from '@dindinho/shared';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/**
 * Página de Central de Convites.
 * @description Permite ao usuário gerenciar convites recebidos e enviados para colaboração em contas.
 * @since 1.0.0
 */
@Component({
  selector: 'app-invites',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, ToastModule, DatePipe],
  host: {
    class: 'block',
  },
  template: `
    <div class="p-4 flex flex-col gap-6 max-w-5xl mx-auto" data-testid="invites-page">
      <p-toast />

      <!-- Cabeçalho -->
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold text-slate-800">Central de Convites</h1>
        <p class="text-slate-500">Gerencie seus convites de colaboração enviados e recebidos.</p>
      </div>

      <!-- Convites Recebidos -->
      <section data-testid="received-invites-section">
        <h2 class="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <i class="pi pi-inbox"></i>
          Convites Recebidos
          @if (inviteService.pendingReceivedInvites().length > 0) {
            <span class="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {{ inviteService.pendingReceivedInvites().length }}
            </span>
          }
        </h2>

        @if (inviteService.receivedInvites().length === 0) {
          <p-card styleClass="!bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
            <div class="flex flex-col items-center py-8 text-slate-400">
              <i class="pi pi-envelope text-4xl mb-3"></i>
              <p>Nenhum convite recebido.</p>
            </div>
          </p-card>
        } @else {
          <div class="grid gap-4">
            @for (invite of inviteService.receivedInvites(); track invite.id) {
              <p-card
                styleClass="shadow-sm border border-slate-100 hover:border-slate-200 transition-all"
              >
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div class="flex items-start gap-4">
                    <div
                      class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"
                    >
                      <i class="pi pi-user text-xl"></i>
                    </div>
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-slate-800">{{ invite.sender.name }}</span>
                        <p-tag
                          [value]="getStatusLabel(invite.status)"
                          [severity]="getStatusSeverity(invite.status)"
                        />
                      </div>
                      <p class="text-sm text-slate-600 mb-2">
                        Convidou você para colaborar em:
                        <span class="font-semibold">{{ invite.accounts.length }} conta(s)</span>
                      </p>
                      <div class="flex flex-wrap gap-1">
                        @for (acc of invite.accounts; track acc.accountId) {
                          <span
                            class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
                          >
                            {{ acc.accountName }} ({{ acc.permission }})
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  @if (invite.status === InviteStatus.PENDING) {
                    <div class="flex items-center gap-2 md:ml-auto">
                      <p-button
                        label="Rejeitar"
                        icon="pi pi-times"
                        severity="danger"
                        [text]="true"
                        (click)="onReject(invite.id)"
                        [loading]="inviteService.isLoading()"
                      />
                      <p-button
                        label="Aceitar"
                        icon="pi pi-check"
                        severity="success"
                        (click)="onAccept(invite.id)"
                        [loading]="inviteService.isLoading()"
                      />
                    </div>
                  }
                </div>
              </p-card>
            }
          </div>
        }
      </section>

      <!-- Convites Enviados -->
      <section data-testid="sent-invites-section">
        <h2 class="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <i class="pi pi-send"></i>
          Convites Enviados
        </h2>

        @if (inviteService.sentInvites().length === 0) {
          <p-card styleClass="!bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
            <div class="flex flex-col items-center py-8 text-slate-400">
              <i class="pi pi-send text-4xl mb-3"></i>
              <p>Nenhum convite enviado.</p>
            </div>
          </p-card>
        } @else {
          <div class="grid gap-4">
            @for (invite of inviteService.sentInvites(); track invite.id) {
              <p-card
                styleClass="shadow-sm border border-slate-100 hover:border-slate-200 transition-all"
              >
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div class="flex items-start gap-4">
                    <div
                      class="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center shrink-0"
                    >
                      <i class="pi pi-envelope text-xl"></i>
                    </div>
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-slate-800">{{ invite.email }}</span>
                        <p-tag
                          [value]="getStatusLabel(invite.status)"
                          [severity]="getStatusSeverity(invite.status)"
                        />
                      </div>
                      <p class="text-sm text-slate-600 mb-2">
                        Enviado em {{ invite.createdAt | date: 'short' }} • Expira em
                        {{ invite.expiresAt | date: 'short' }}
                      </p>
                      <div class="flex flex-wrap gap-1">
                        @for (acc of invite.accounts; track acc.accountId) {
                          <span
                            class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
                          >
                            {{ acc.accountName }} ({{ acc.permission }})
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  @if (invite.status === InviteStatus.PENDING) {
                    <div class="flex items-center gap-2 md:ml-auto">
                      <p-button
                        label="Revogar"
                        icon="pi pi-trash"
                        severity="danger"
                        [text]="true"
                        (click)="onRevoke(invite.id)"
                        [loading]="inviteService.isLoading()"
                      />
                    </div>
                  }
                </div>
              </p-card>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class InvitesPage implements OnInit {
  protected inviteService = inject(InviteService);
  private messageService = inject(MessageService);
  protected InviteStatus = InviteStatus;

  ngOnInit() {
    this.inviteService.loadReceivedInvites();
    this.inviteService.loadSentInvites();
  }

  /**
   * Aceita um convite recebido.
   * @param inviteId ID do convite a ser aceito.
   */
  protected onAccept(inviteId: string) {
    this.inviteService.respondToInvite(inviteId, InviteStatus.ACCEPTED).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Convite aceito com sucesso!',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: err.error?.message || 'Erro ao aceitar convite',
        });
      },
    });
  }

  /**
   * Rejeita um convite recebido.
   * @param inviteId ID do convite a ser rejeitado.
   */
  protected onReject(inviteId: string) {
    this.inviteService.respondToInvite(inviteId, InviteStatus.REJECTED).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Convite rejeitado com sucesso!',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: err.error?.message || 'Erro ao rejeitar convite',
        });
      },
    });
  }

  /**
   * Revoga (deleta) um convite enviado.
   * @param inviteId ID do convite a ser revogado.
   */
  protected onRevoke(inviteId: string) {
    this.inviteService.revokeInvite(inviteId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Convite revogado com sucesso!',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: err.error?.message || 'Erro ao revogar convite',
        });
      },
    });
  }

  /**
   * Obtém o rótulo legível para o status do convite.
   * @param status Status do convite.
   * @returns Rótulo formatado.
   */
  protected getStatusLabel(status: InviteStatus): string {
    const labels: Record<InviteStatus, string> = {
      [InviteStatus.PENDING]: 'Pendente',
      [InviteStatus.ACCEPTED]: 'Aceito',
      [InviteStatus.REJECTED]: 'Rejeitado',
      [InviteStatus.EXPIRED]: 'Expirado',
    };
    return labels[status] || status;
  }

  /**
   * Obtém a severidade visual para o status do convite.
   * @param status Status do convite.
   * @returns Severidade do componente Tag.
   */
  protected getStatusSeverity(
    status: InviteStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const severities: Record<InviteStatus, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      [InviteStatus.PENDING]: 'info',
      [InviteStatus.ACCEPTED]: 'success',
      [InviteStatus.REJECTED]: 'danger',
      [InviteStatus.EXPIRED]: 'warn',
    };
    return severities[status] || 'info';
  }
}

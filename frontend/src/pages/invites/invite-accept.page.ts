import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InviteService } from '../../app/services/invite.service';
import { AuthService } from '../../app/services/auth.service';
import { InviteDTO, InviteStatus } from '@dindinho/shared';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Página de Aceite de Convite.
 * @description Permite ao usuário visualizar e aceitar um convite através de um link seguro com token.
 * @since 1.0.0
 */
@Component({
  selector: 'app-invite-accept',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    RouterLink,
  ],
  providers: [MessageService],
  template: `
    <div class="min-h-[80dvh] flex items-center justify-center p-4 bg-slate-50/50">
      <p-toast />

      <div class="w-full max-w-md">
        <!-- Estado de Carregamento -->
        @if (isLoading()) {
          <p-card styleClass="shadow-lg border-0">
            <div class="flex flex-col items-center gap-4">
              <p-skeleton shape="circle" size="4rem" />
              <p-skeleton width="10rem" height="1.5rem" />
              <p-skeleton width="100%" height="4rem" />
              <p-skeleton width="100%" height="3rem" />
            </div>
          </p-card>
        } @else if (invite(); as inv) {
          <!-- Card de Convite -->
          <p-card styleClass="shadow-lg border-0 overflow-hidden">
            <ng-template pTemplate="header">
              <div class="h-2 bg-indigo-600"></div>
            </ng-template>

            <div class="flex flex-col items-center text-center gap-4 py-4">
              <div
                class="w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2"
              >
                <i class="pi pi-envelope text-4xl"></i>
              </div>

              <div>
                <h1 class="text-2xl font-bold text-slate-800 mb-1">Convite para Colaborar</h1>
                <p class="text-slate-500">
                  <span class="font-semibold text-slate-700">{{ inv.sender.name }}</span>
                  convidou você para gerenciar contas no Dindinho.
                </p>
              </div>

              <div class="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 text-left">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Contas incluídas
                </p>
                <div class="flex flex-col gap-2">
                  @for (acc of inv.accounts; track acc.accountId) {
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-slate-700 font-medium">{{ acc.accountName }}</span>
                      <p-tag [value]="acc.permission" severity="info" [rounded]="true" />
                    </div>
                  }
                </div>
              </div>

              @if (inv.status !== 'PENDING') {
                <div
                  class="w-full p-4 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-sm flex items-center gap-3"
                >
                  <i class="pi pi-exclamation-triangle"></i>
                  <p>Este convite já foi {{ getStatusLabel(inv.status) }}.</p>
                </div>
              } @else {
                <div class="w-full flex flex-col gap-3 mt-4">
                  @if (isAuthenticated()) {
                    @if (isCorrectUser(inv.email)) {
                      <p-button
                        label="Aceitar Convite"
                        icon="pi pi-check"
                        styleClass="w-full py-3"
                        [loading]="isSubmitting()"
                        (click)="onAccept()"
                      />
                    } @else {
                      <div
                        class="p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm flex flex-col gap-2"
                      >
                        <p class="font-semibold">E-mail incompatível</p>
                        <p>
                          Este convite foi enviado para <b>{{ inv.email }}</b
                          >, mas você está logado como <b>{{ currentUserEmail() }}</b
                          >.
                        </p>
                        <p-button
                          label="Sair e usar outra conta"
                          icon="pi pi-sign-out"
                          severity="danger"
                          [text]="true"
                          (click)="onLogout()"
                        />
                      </div>
                    }
                  } @else {
                    <p-button
                      label="Entrar para Aceitar"
                      icon="pi pi-sign-in"
                      styleClass="w-full py-3"
                      routerLink="/login"
                      [queryParams]="{ returnUrl: currentUrl }"
                    />
                    <p class="text-xs text-slate-400">
                      Não tem uma conta?
                      <a routerLink="/signup" class="text-indigo-600 font-bold">Cadastre-se</a>
                    </p>
                  }
                </div>
              }
            </div>
          </p-card>
        } @else if (error()) {
          <!-- Estado de Erro -->
          <p-card styleClass="shadow-lg border-0">
            <div class="flex flex-col items-center text-center gap-4 py-8">
              <div
                class="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center"
              >
                <i class="pi pi-exclamation-circle text-3xl"></i>
              </div>
              <div>
                <h2 class="text-xl font-bold text-slate-800">Convite não encontrado</h2>
                <p class="text-slate-500 mt-2">
                  O link pode estar expirado ou o convite foi removido pelo remetente.
                </p>
              </div>
              <p-button label="Voltar ao início" icon="pi pi-home" routerLink="/" [text]="true" />
            </div>
          </p-card>
        }
      </div>
    </div>
  `,
})
export class InviteAcceptPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inviteService = inject(InviteService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  invite = signal<InviteDTO | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  isAuthenticated = signal(false);
  currentUserEmail = signal<string | null>(null);
  currentUrl = '';

  ngOnInit() {
    this.currentUrl = this.router.url;
    this.checkAuth();

    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.isLoading.set(false);
      this.error.set('Token não fornecido');
      return;
    }

    this.loadInvite(token);
  }

  private checkAuth() {
    const user = this.authService.currentUser();
    this.isAuthenticated.set(!!user);
    this.currentUserEmail.set(user?.email || null);
  }

  private loadInvite(token: string) {
    this.inviteService.getInviteByToken(token).subscribe({
      next: (inv) => {
        this.invite.set(inv);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar convite');
        this.isLoading.set(false);
      },
    });
  }

  isCorrectUser(inviteEmail: string): boolean {
    return inviteEmail.toLowerCase() === this.currentUserEmail()?.toLowerCase();
  }

  onAccept() {
    const inv = this.invite();
    if (!inv) return;

    this.isSubmitting.set(true);
    this.inviteService.respondToInvite(inv.id, InviteStatus.ACCEPTED).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Convite aceito com sucesso! Redirecionando...',
        });
        setTimeout(() => {
          this.router.navigate(['/accounts']);
        }, 1500);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: err.error?.message || 'Erro ao aceitar convite',
        });
        this.isSubmitting.set(false);
      },
    });
  }

  onLogout() {
    this.authService.logout();
    this.checkAuth();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACCEPTED':
        return 'aceito';
      case 'REJECTED':
        return 'rejeitado';
      case 'EXPIRED':
        return 'expirado';
      default:
        return status.toLowerCase();
    }
  }
}

import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  BaseDocsLayoutComponent,
  SidebarCategory,
} from '../base-docs-layout/base-docs-layout.component';
import { AuthService } from '../../services/auth.service';

/**
 * @description
 * Layout para documentação técnica e administrativa.
 * Estende o BaseDocsLayoutComponent com configurações específicas de Admin.
 */
@Component({
  selector: 'app-admin-docs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BaseDocsLayoutComponent, RouterLink],
  template: `
    <app-base-docs-layout
      [testId]="'admin-docs-layout'"
      [logoLink]="'/docs/admin/intro'"
      [logoLetter]="'A'"
      [logoBgClass]="'bg-indigo-600'"
      [logoTextClass]="'text-indigo-600'"
      [logoSubtitle]="'Interno'"
      [badgeText]="'Docs Admin'"
      [footerText]="'Dindinho Interno v1.0.0'"
      [activeLinkClass]="'bg-indigo-50 text-indigo-700 font-bold'"
      currentContext="admin"
      [categories]="categories"
    >
      <div sidebarFooter class="flex flex-col gap-2">
        <!-- Visão do Usuário (Acesso Rápido) -->
        <a
          routerLink="/docs/intro"
          data-testid="user-view-link"
          aria-label="Ir para a visão pública do usuário"
          class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-all border border-slate-200/60 bg-white shadow-sm group/user"
        >
          <div class="flex items-center gap-2" aria-hidden="true">
            <i class="pi pi-eye text-emerald-500 text-xs"></i>
            <span class="text-[11px] font-bold text-slate-700">Visão do Usuário</span>
          </div>
          <i
            class="pi pi-arrow-right text-[8px] text-slate-300 group-hover/user:translate-x-0.5 transition-transform"
            aria-hidden="true"
          ></i>
        </a>

        <!-- Entrar no Dindinho / Voltar -->
        <button
          (click)="goToApp()"
          data-testid="back-to-app-button"
          [attr.aria-label]="backButtonText()"
          class="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-100 active:scale-95"
        >
          <i [class]="'pi ' + backButtonIcon() + ' text-[10px]'" aria-hidden="true"></i>
          <span aria-hidden="true">{{ backButtonText() }}</span>
        </button>
      </div>
    </app-base-docs-layout>
  `,
})
export class AdminDocsLayoutComponent {
  private readonly auth = inject(AuthService);

  protected readonly backButtonText = computed(() =>
    this.auth.isAuthenticated() ? 'Voltar para a Plataforma' : 'Entrar no Dindinho',
  );

  protected readonly backButtonIcon = computed(() =>
    this.auth.isAuthenticated() ? 'pi-arrow-left' : 'pi-sign-in',
  );

  protected categories: SidebarCategory[] = [
    {
      id: 'geral',
      label: 'Geral',
      items: [
        {
          id: 'intro',
          label: 'Introdução',
          icon: 'pi-home',
          link: '/docs/admin/intro',
        },
        {
          id: 'codigo-conduta',
          label: 'Código de Conduta',
          icon: 'pi-shield',
          link: '/docs/admin/codigo-conduta',
        },
      ],
    },
    {
      id: 'engenharia',
      label: 'Engenharia',
      items: [
        {
          id: 'arch',
          label: 'Arquitetura',
          icon: 'pi-sitemap',
          link: '/docs/admin/architecture',
        },
        {
          id: 'adr',
          label: 'ADRs',
          icon: 'pi-book',
          link: '/docs/admin/adr',
        },
        {
          id: 'naming',
          label: 'Convenções de Nomenclatura',
          icon: 'pi-tag',
          link: '/docs/admin/naming',
        },
        {
          id: 'frontend-standards',
          label: 'Padrões de Frontend',
          icon: 'pi-desktop',
          link: '/docs/admin/frontend-standards',
        },
        {
          id: 'backend-standards',
          label: 'Padrões de Backend',
          icon: 'pi-server',
          link: '/docs/admin/backend-standards',
        },
        {
          id: 'tests',
          label: 'Testes e QA',
          icon: 'pi-check-circle',
          link: '/docs/admin/tests',
        },
        {
          id: 'guia-contribuicao',
          label: 'Como Contribuir',
          icon: 'pi-plus-circle',
          link: '/docs/admin/guia-contribuicao',
        },
        {
          id: 'guia-doc',
          label: 'Guia de Documentação',
          icon: 'pi-book',
          link: '/docs/admin/guia-documentacao',
        },
      ],
    },
    {
      id: 'produto',
      label: 'Domínios do Produto',
      items: [
        {
          id: 'auth',
          label: 'Autenticação',
          icon: 'pi-lock',
          link: '/docs/admin/auth',
        },
        {
          id: 'contas',
          label: 'Contas e Cartões',
          icon: 'pi-wallet',
          link: '/docs/admin/dominio-contas',
        },
        {
          id: 'transacoes',
          label: 'Transações',
          icon: 'pi-list',
          link: '/docs/admin/dominio-transacoes',
        },
        {
          id: 'relatorios',
          label: 'Relatórios',
          icon: 'pi-chart-bar',
          link: '/docs/admin/dominio-relatorios',
        },
        {
          id: 'colaboracao',
          label: 'Colaboração',
          icon: 'pi-users',
          link: '/docs/admin/dominio-colaboracao',
        },
        {
          id: 'metas',
          label: 'Metas de Economia',
          icon: 'pi-bullseye',
          link: '/docs/admin/dominio-metas',
        },
      ],
    },
    {
      id: 'estrategia',
      label: 'Visão & Estratégia',
      items: [
        {
          id: 'roadmap',
          label: 'Roadmap de Evolução',
          icon: 'pi-map',
          link: '/docs/admin/roadmap',
        },
      ],
    },
    {
      id: 'backlog',
      label: 'Evolução & Backlog',
      isBacklog: true,
      items: [
        {
          id: 'fix-docs-access',
          label: 'Acesso Docs (Fix)',
          icon: 'pi-wrench',
          link: '/docs/admin/fix-docs-access',
          status: 'CONCLUIDO',
          priority: 'alta',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'plan-invites',
          label: 'Sistema de Convites',
          icon: 'pi-user-plus',
          link: '/docs/admin/sistema-convites',
          status: 'CONCLUIDO',
          priority: 'alta',
          owner: 'product',
          isBacklog: true,
        },
        {
          id: 'refactor-roles',
          label: 'Refatoração de Roles',
          icon: 'pi-key',
          link: '/docs/admin/refatoracao-roles-permissoes',
          status: 'CONCLUIDO',
          priority: 'alta',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'user-profile',
          label: 'Perfil do Usuário',
          icon: 'pi-user',
          link: '/docs/admin/perfil-usuario',
          status: 'DISCUSSAO',
          priority: 'media',
          owner: 'product',
          isBacklog: true,
        },
        {
          id: 'admin-portal',
          label: 'Portal Admin',
          icon: 'pi-lock',
          link: '/docs/admin/portal-admin',
          status: 'DISCUSSAO',
          priority: 'media',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'crypto-privacy',
          label: 'Criptografia E2E',
          icon: 'pi-shield',
          link: '/docs/admin/criptografia-privacidade',
          status: 'DISCUSSAO',
          priority: 'alta',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'pwa-experience',
          label: 'PWA Full',
          icon: 'pi-mobile',
          link: '/docs/admin/pwa-full',
          status: 'DISCUSSAO',
          priority: 'media',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'plan-goals',
          label: 'Planejamento de Metas',
          icon: 'pi-flag',
          link: '/docs/admin/planejamento-metas',
          status: 'DISCUSSAO',
          priority: 'alta',
          owner: 'product',
          isBacklog: true,
        },
        {
          id: 'plan-routing',
          label: 'Evolução de Rotas',
          icon: 'pi-directions',
          link: '/docs/admin/evolucao-rotas',
          status: 'PENDENTE',
          priority: 'alta',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'test-plan',
          label: 'Plano de Testes E2E',
          icon: 'pi-check-square',
          link: '/docs/admin/plano-testes',
          status: 'PENDENTE',
          priority: 'media',
          owner: 'engineering',
          isBacklog: true,
        },

        {
          id: 'plan-notifications',
          label: 'Sistema de Notificações',
          icon: 'pi-bell',
          link: '/docs/admin/notificacoes',
          status: 'DISCUSSAO',
          priority: 'media',
          owner: 'product',
          isBacklog: true,
        },
        {
          id: 'plan-url-sync',
          label: 'Sincronização de URL',
          icon: 'pi-sync',
          link: '/docs/admin/plan-url-sync',
          status: 'CONCLUIDO',
          priority: 'alta',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'plan-accounts',
          label: 'Filtro de Contas',
          icon: 'pi-filter',
          link: '/docs/admin/plan-accounts',
          status: 'CONCLUIDO',
          priority: 'alta',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'plan-time-filter',
          label: 'Filtro Temporal',
          icon: 'pi-calendar',
          link: '/docs/admin/plan-time-filter',
          status: 'CONCLUIDO',
          priority: 'alta',
          owner: 'engineering',
          isBacklog: true,
        },
        {
          id: 'plan-documentation',
          label: 'Plano de Documentação',
          icon: 'pi-book',
          link: '/docs/admin/plan-documentation',
          status: 'CONCLUIDO',
          priority: 'alta',
          owner: 'engineering',
          isBacklog: true,
        },
      ],
    },
    {
      id: 'infra',
      label: 'Infraestrutura & API',
      items: [
        {
          id: 'api-ref',
          label: 'Referência de API',
          icon: 'pi-code',
          link: '/docs/admin/api-ref',
        },
        {
          id: 'deploy',
          label: 'Processo de Deploy',
          icon: 'pi-cloud-upload',
          link: '/docs/admin/deploy',
        },
        {
          id: 'ops',
          label: 'Guia de Operações',
          icon: 'pi-cog',
          link: '/docs/admin/ops',
        },
      ],
    },
  ];

  /**
   * Redireciona o usuário para o domínio principal da aplicação (Dashboard).
   * Remove o subdomínio 'docs.' da origem atual (preservando protocolo e porta).
   */
  goToApp(): void {
    const origin = window.location.origin;
    const isAuthenticated = this.auth.isAuthenticated();
    const targetPath = isAuthenticated ? '/dashboard' : '/login';

    if (origin.includes('://docs.')) {
      const mainOrigin = origin.replace('://docs.', '://');
      window.location.href = `${mainOrigin}${targetPath}`;
    } else {
      window.location.href = targetPath;
    }
  }
}

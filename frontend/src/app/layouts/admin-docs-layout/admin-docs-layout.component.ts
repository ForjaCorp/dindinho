import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
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
          class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-all border border-slate-200/60 bg-white shadow-sm group/user"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-eye text-emerald-500 text-xs"></i>
            <span class="text-[11px] font-bold text-slate-700">Visão do Usuário</span>
          </div>
          <i
            class="pi pi-arrow-right text-[8px] text-slate-300 group-hover/user:translate-x-0.5 transition-transform"
          ></i>
        </a>

        <button
          (click)="goToApp()"
          class="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-100 active:scale-95"
        >
          <i class="pi pi-arrow-left text-[10px]"></i>
          <span>Voltar para a Plataforma</span>
        </button>
      </div>
    </app-base-docs-layout>
  `,
})
export class AdminDocsLayoutComponent {
  private readonly auth = inject(AuthService);

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
          priority: 'alta',
          owner: 'engineering',
        },
        {
          id: 'adr',
          label: 'ADRs',
          icon: 'pi-book',
          link: '/docs/admin/adr',
          priority: 'media',
          owner: 'architecture',
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
          icon: 'pi-target',
          link: '/docs/admin/dominio-metas',
        },
      ],
    },
    {
      id: 'backlog',
      label: 'Backlog & Planejamento',
      items: [
        {
          id: 'roadmap',
          label: 'Roadmap de Evolução',
          icon: 'pi-map',
          link: '/docs/admin/roadmap',
        },
        {
          id: 'test-plan',
          label: 'Plano de Testes E2E',
          icon: 'pi-check-square',
          link: '/docs/admin/test-plan-e2e',
        },
        {
          id: 'plan-routing',
          label: 'Evolução de Rotas',
          icon: 'pi-directions',
          link: '/docs/admin/plan-routing',
        },
        {
          id: 'plan-accounts',
          label: 'Filtro de Contas',
          icon: 'pi-filter',
          link: '/docs/admin/plan-accounts',
        },
        {
          id: 'plan-notifications',
          label: 'Sistema de Notificações',
          icon: 'pi-bell',
          link: '/docs/admin/plan-notifications',
        },
        {
          id: 'plan-goals',
          label: 'Planejamento de Metas',
          icon: 'pi-flag',
          link: '/docs/admin/plan-goals',
        },
        {
          id: 'plan-url-sync',
          label: 'Sincronização de URL',
          icon: 'pi-sync',
          link: '/docs/admin/plan-url-sync',
        },
        {
          id: 'plan-invites',
          label: 'Sistema de Convites',
          icon: 'pi-user-plus',
          link: '/docs/admin/plan-invites',
        },
        {
          id: 'plan-time-filter',
          label: 'Filtro Temporal',
          icon: 'pi-calendar',
          link: '/docs/admin/plan-time-filter',
        },
        {
          id: 'plan-documentation',
          label: 'Plano de Documentação',
          icon: 'pi-book',
          link: '/docs/admin/plan-documentation',
        },
        {
          id: 'fix-docs-access',
          label: 'Acesso Docs (Fix)',
          icon: 'pi-wrench',
          link: '/docs/admin/fix-docs-access',
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
    if (origin.includes('://docs.')) {
      const mainOrigin = origin.replace('://docs.', '://');
      window.location.href = `${mainOrigin}/dashboard`;
    } else {
      window.location.href = '/dashboard';
    }
  }
}

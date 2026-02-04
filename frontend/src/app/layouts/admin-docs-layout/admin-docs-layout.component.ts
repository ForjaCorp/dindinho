import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BaseDocsLayoutComponent,
  SidebarCategory,
} from '../base-docs-layout/base-docs-layout.component';

/**
 * @description
 * Layout para documentação técnica e administrativa.
 * Estende o BaseDocsLayoutComponent com configurações específicas de Admin.
 */
@Component({
  selector: 'app-admin-docs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BaseDocsLayoutComponent],
  template: `
    <app-base-docs-layout
      [testId]="'admin-docs-layout'"
      [logoLink]="'/docs/admin/admin-intro'"
      [logoLetter]="'A'"
      [logoBgClass]="'bg-indigo-600'"
      [logoTextClass]="'text-indigo-600'"
      [logoSubtitle]="'Interno'"
      [badgeText]="'Docs Admin'"
      [footerText]="'Dindinho Interno v1.0.0'"
      [activeLinkClass]="'bg-indigo-50 text-indigo-700 font-bold'"
      [categories]="categories"
      (backToApp)="goToApp()"
    >
    </app-base-docs-layout>
  `,
})
export class AdminDocsLayoutComponent {
  protected categories: SidebarCategory[] = [
    {
      id: 'geral',
      label: 'Geral',
      items: [
        {
          id: 'admin-intro',
          label: 'Introdução',
          icon: 'pi-home',
          link: '/docs/admin/admin-intro',
        },
      ],
    },
    {
      id: 'engenharia',
      label: 'Engenharia',
      items: [
        { id: 'arch', label: 'Arquitetura', icon: 'pi-sitemap', link: '/docs/admin/architecture' },
        { id: 'adr', label: 'ADRs', icon: 'pi-book', link: '/docs/admin/adr' },
      ],
    },
    {
      id: 'backlog',
      label: 'Backlog & Planejamento',
      isBacklog: true,
      items: [
        {
          id: 'roadmap',
          label: 'Roadmap',
          icon: 'pi-map',
          link: '/docs/admin/roadmap',
          status: 'WIP',
        },
        {
          id: 'test-plan-e2e',
          label: 'Plano E2E',
          icon: 'pi-check-square',
          link: '/docs/admin/test-plan-e2e',
          status: 'DONE',
        },
        {
          id: 'fix-docs-access',
          label: 'Exp. de Acesso',
          icon: 'pi-bolt',
          link: '/docs/admin/fix-docs-access',
          status: 'WIP',
        },
        {
          id: 'plan-routing',
          label: 'Evolução de Rotas',
          icon: 'pi-directions',
          link: '/docs/admin/plan-routing',
          status: 'RFC',
        },
        {
          id: 'plan-accounts',
          label: 'Filtro de Contas',
          icon: 'pi-filter',
          link: '/docs/admin/plan-accounts',
          status: 'RFC',
        },
        {
          id: 'plan-time-filter',
          label: 'Filtro Temporal',
          icon: 'pi-calendar',
          link: '/docs/admin/plan-time-filter',
          status: 'RFC',
        },
        {
          id: 'plan-notifications',
          label: 'Notificações',
          icon: 'pi-bell',
          link: '/docs/admin/plan-notifications',
          status: 'RFC',
        },
        {
          id: 'plan-invites',
          label: 'Convites',
          icon: 'pi-user-plus',
          link: '/docs/admin/plan-invites',
          status: 'RFC',
        },
        {
          id: 'plan-url-sync',
          label: 'Sincronismo URL',
          icon: 'pi-sync',
          link: '/docs/admin/plan-url-sync',
          status: 'RFC',
        },
      ],
    },
    {
      id: 'infra',
      label: 'Infraestrutura',
      items: [
        { id: 'ops', label: 'Operações', icon: 'pi-cog', link: '/docs/admin/ops' },
        {
          id: 'deploy',
          label: 'Deploy & Cloud',
          icon: 'pi-cloud-upload',
          link: '/docs/admin/deploy',
        },
        { id: 'api-ref', label: 'Referência de API', icon: 'pi-code', link: '/docs/admin/api-ref' },
      ],
    },
    {
      id: 'dominios',
      label: 'Domínios do Produto',
      items: [
        {
          id: 'dominio-auth',
          label: 'Autenticação',
          icon: 'pi-lock',
          link: '/docs/admin/dominio-auth',
        },
        {
          id: 'dominio-contas',
          label: 'Contas e Cartões',
          icon: 'pi-wallet',
          link: '/docs/admin/dominio-contas',
        },
        {
          id: 'dominio-transacoes',
          label: 'Transações',
          icon: 'pi-list',
          link: '/docs/admin/dominio-transacoes',
        },
        {
          id: 'dominio-relatorios',
          label: 'Relatórios',
          icon: 'pi-chart-bar',
          link: '/docs/admin/dominio-relatorios',
        },
        {
          id: 'dominio-colaboracao',
          label: 'Colaboração',
          icon: 'pi-users',
          link: '/docs/admin/dominio-colaboracao',
        },
        {
          id: 'dominio-metas',
          label: 'Metas de Economia',
          icon: 'pi-briefcase',
          link: '/docs/admin/dominio-metas',
        },
      ],
    },
  ];

  /**
   * Redireciona o usuário para o domínio principal da aplicação (Dashboard).
   */
  goToApp(): void {
    const host = window.location.host;
    if (host.startsWith('docs.')) {
      const mainDomain = host.replace('docs.', '');
      window.location.href = `${window.location.protocol}//${mainDomain}/dashboard`;
    } else {
      window.location.href = '/dashboard';
    }
  }
}

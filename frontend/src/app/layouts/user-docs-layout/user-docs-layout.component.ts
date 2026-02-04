import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BaseDocsLayoutComponent,
  SidebarCategory,
} from '../base-docs-layout/base-docs-layout.component';

/**
 * @description
 * Layout para documentação de usuários autenticados.
 * Oferece navegação lateral e contexto de uso do sistema.
 * Estende o BaseDocsLayoutComponent com configurações específicas de Usuário.
 */
@Component({
  selector: 'app-user-docs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BaseDocsLayoutComponent],
  template: `
    <app-base-docs-layout
      testId="user-docs-layout"
      logoLink="/docs"
      logoLetter="D"
      logoBgClass="bg-emerald-600"
      logoTextClass="text-emerald-600"
      logoSubtitle="Docs"
      badgeText="User Guide"
      footerText="Dindinho v1.0.0"
      activeLinkClass="bg-emerald-50 text-emerald-700 font-bold"
      [categories]="categories"
      (backToApp)="goToApp()"
    >
    </app-base-docs-layout>
  `,
})
export class UserDocsLayoutComponent {
  protected categories: SidebarCategory[] = [
    {
      id: 'guia',
      label: 'Guia do Usuário',
      items: [
        {
          id: 'intro',
          label: 'Introdução',
          icon: 'pi-info-circle',
          link: '/docs/user/intro',
        },
        {
          id: 'principles',
          label: 'Nossos Princípios',
          icon: 'pi-star',
          link: '/docs/user/principles',
        },
      ],
    },
    {
      id: 'dominios',
      label: 'Domínios do Produto',
      items: [
        {
          id: 'auth',
          label: 'Autenticação',
          icon: 'pi-lock',
          link: '/docs/user/dominio-auth',
        },
        {
          id: 'accounts',
          label: 'Contas e Cartões',
          icon: 'pi-wallet',
          link: '/docs/user/dominio-contas',
        },
        {
          id: 'transactions',
          label: 'Transações',
          icon: 'pi-list',
          link: '/docs/user/dominio-transacoes',
        },
        {
          id: 'reports',
          label: 'Relatórios',
          icon: 'pi-chart-bar',
          link: '/docs/user/dominio-relatorios',
        },
        {
          id: 'collaboration',
          label: 'Colaboração',
          icon: 'pi-users',
          link: '/docs/user/dominio-colaboracao',
        },
        {
          id: 'metas',
          label: 'Metas de Economia',
          icon: 'pi-briefcase',
          link: '/docs/user/dominio-metas',
        },
      ],
    },
  ];

  /**
   * Redireciona o usuário para o domínio principal da aplicação (Dashboard).
   * Remove o subdomínio 'docs.' do host atual (preservando a porta se existir).
   */
  goToApp(): void {
    const host = window.location.host;
    if (host.startsWith('docs.')) {
      const mainDomain = host.replace('docs.', '');
      window.location.href = `${window.location.protocol}//${mainDomain}/dashboard`;
    } else {
      // Se já estiver no domínio principal (desenvolvimento), apenas navega
      window.location.href = '/dashboard';
    }
  }
}

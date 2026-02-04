import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  BaseDocsLayoutComponent,
  SidebarCategory,
} from '../base-docs-layout/base-docs-layout.component';

/**
 * @description
 * Layout para documentação pública e de usuários.
 * Oferece navegação lateral e contexto de uso do sistema.
 * Estende o BaseDocsLayoutComponent com configurações unificadas.
 */
@Component({
  selector: 'app-user-docs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BaseDocsLayoutComponent, RouterLink],
  template: `
    <app-base-docs-layout
      testId="user-docs-layout"
      logoLink="/docs"
      logoLetter="D"
      logoBgClass="bg-emerald-600"
      logoTextClass="text-emerald-600"
      logoSubtitle="Docs"
      badgeText="Documentação"
      footerText="Dindinho v1.0.0"
      activeLinkClass="bg-emerald-50 text-emerald-700 font-bold"
      searchResultHoverClass="hover:bg-emerald-50"
      searchResultActiveClass="bg-emerald-50"
      searchIconHighlightClass="group-hover:text-emerald-600"
      searchTextHighlightClass="group-hover:text-emerald-700"
      searchArrowHighlightClass="group-hover:text-emerald-400"
      searchKbdHighlightClass="group-hover/search:text-emerald-500"
      searchMobileHighlightClass="hover:text-emerald-600"
      accentTextClass="text-emerald-500"
      accentFocusClass="focus:ring-emerald-500/20"
      currentContext="user"
      [categories]="categories"
    >
      <div sidebarFooter class="flex flex-col gap-2">
        <!-- Site Institucional -->
        <button
          (click)="goToLanding()"
          class="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all group"
        >
          <i
            class="pi pi-external-link text-[10px] text-slate-400 group-hover:text-emerald-500"
          ></i>
          <span>Site Institucional</span>
        </button>

        <!-- Acesso Rápido Admin (se for admin) -->
        @if (isAdmin()) {
          <a
            routerLink="/docs/admin/intro"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-all border border-slate-200/60 bg-white shadow-sm group/admin"
          >
            <div class="flex items-center gap-2">
              <i class="pi pi-shield text-indigo-500 text-xs"></i>
              <span class="text-[11px] font-bold text-slate-700">Painel Admin</span>
            </div>
            <i
              class="pi pi-arrow-right text-[8px] text-slate-300 group-hover/admin:translate-x-0.5 transition-transform"
            ></i>
          </a>
        }

        <!-- Entrar no Dindinho / Voltar -->
        <button
          (click)="goToApp()"
          class="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm shadow-emerald-100 active:scale-95"
        >
          <i class="pi pi-sign-in text-[10px]"></i>
          <span>{{ backButtonText() }}</span>
        </button>
      </div>
    </app-base-docs-layout>
  `,
})
export class UserDocsLayoutComponent {
  protected readonly auth = inject(AuthService);

  protected readonly isAdmin = computed(() => {
    const user = this.auth.currentUser();
    return user?.role === 'ADMIN';
  });

  protected readonly backButtonText = computed(() =>
    this.auth.isAuthenticated() ? 'Voltar para a Plataforma' : 'Entrar no Dindinho',
  );

  protected categories: SidebarCategory[] = [
    {
      id: 'guia',
      label: 'Guia do Usuário',
      items: [
        {
          id: 'intro',
          label: 'Introdução',
          icon: 'pi-home',
          link: '/docs/intro',
        },
        {
          id: 'principles',
          label: 'Nossos Princípios',
          icon: 'pi-star',
          link: '/docs/principles',
        },
        {
          id: 'faq',
          label: 'Perguntas Frequentes',
          icon: 'pi-question-circle',
          link: '/docs/faq',
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
          link: '/docs/dominio-auth',
        },
        {
          id: 'accounts',
          label: 'Contas e Cartões',
          icon: 'pi-wallet',
          link: '/docs/dominio-contas',
        },
        {
          id: 'transactions',
          label: 'Transações',
          icon: 'pi-list',
          link: '/docs/dominio-transacoes',
        },
        {
          id: 'reports',
          label: 'Relatórios',
          icon: 'pi-chart-bar',
          link: '/docs/dominio-relatorios',
        },
        {
          id: 'collaboration',
          label: 'Colaboração',
          icon: 'pi-users',
          link: '/docs/dominio-colaboracao',
        },
        {
          id: 'metas',
          label: 'Metas de Economia',
          icon: 'pi-target',
          link: '/docs/dominio-metas',
        },
      ],
    },
  ];

  /**
   * Redireciona para a landing page (site institucional).
   * Por enquanto, redireciona para a home do domínio principal.
   */
  goToLanding(): void {
    const origin = window.location.origin;
    if (origin.includes('://docs.')) {
      const mainOrigin = origin.replace('docs.', '');
      window.location.href = mainOrigin;
    } else {
      window.location.href = '/';
    }
  }

  /**
   * Redireciona o usuário para o dashboard principal ou home page.
   * Remove o subdomínio 'docs.' da origem atual (preservando protocolo e porta).
   */
  goToApp(): void {
    const origin = window.location.origin;
    const isAuthenticated = this.auth.isAuthenticated();
    const targetPath = isAuthenticated ? '/dashboard' : '/';

    if (origin.includes('://docs.')) {
      const mainOrigin = origin.replace('docs.', '');
      window.location.href = `${mainOrigin}${targetPath}`;
    } else {
      // Se já estiver no domínio principal (desenvolvimento), apenas navega
      window.location.href = targetPath;
    }
  }
}

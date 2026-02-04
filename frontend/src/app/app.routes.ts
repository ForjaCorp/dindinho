import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { subdomainGuard } from './guards/subdomain.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { UserDocsLayoutComponent } from './layouts/user-docs-layout/user-docs-layout.component';
import { AdminDocsLayoutComponent } from './layouts/admin-docs-layout/admin-docs-layout.component';

/**
 * @description
 * Configuração das rotas da aplicação Dindinho.
 * Define a hierarquia de navegação e os componentes associados a cada rota.
 *
 * @constant {Routes}
 */
export const routes: Routes = [
  // Redirecionamento inicial
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const hostname = window.location.hostname;
      if (hostname.startsWith('docs.')) {
        return 'docs/intro'; // Nova rota principal unificada
      }
      return 'login';
    },
  },

  // Rotas Públicas (Sem Header/Footer)
  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [subdomainGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('../pages/login/login.page').then((m) => m.LoginComponent),
        canActivate: [guestGuard],
      },
      {
        path: 'signup',
        loadComponent: () => import('../pages/signup/signup.page').then((m) => m.SignupPage),
        canActivate: [guestGuard],
      },
    ],
  },

  // Conteúdo Público (Marketing/Info)
  {
    path: '',
    component: PublicLayoutComponent,
    canActivate: [subdomainGuard],
    children: [
      {
        path: 'faq',
        loadComponent: () => import('../pages/public/faq.page').then((m) => m.FAQPage),
      },
      {
        path: 'pricing',
        loadComponent: () => import('../pages/public/pricing.page').then((m) => m.PricingPage),
      },
      {
        path: 'privacy-policy',
        loadComponent: () =>
          import('../pages/public/privacy-policy.page').then((m) => m.PrivacyPolicyPage),
      },
      {
        path: 'onboarding',
        loadComponent: () =>
          import('../pages/public/onboarding.page').then((m) => m.OnboardingPage),
      },
    ],
  },

  // Documentação (Pública)
  {
    path: 'docs',
    component: UserDocsLayoutComponent,
    canActivate: [subdomainGuard],
    children: [
      {
        path: '',
        redirectTo: 'intro',
        pathMatch: 'full',
      },
      {
        path: ':slug',
        loadComponent: () => import('../pages/docs/docs.page').then((m) => m.DocsPage),
      },
    ],
  },

  // Documentação Interna/Admin (Protegida)
  {
    path: 'docs/admin',
    component: AdminDocsLayoutComponent,
    canActivate: [subdomainGuard, authGuard],
    data: { roles: ['ADMIN'], context: 'admin' },
    children: [
      {
        path: '',
        redirectTo: 'intro',
        pathMatch: 'full',
      },
      {
        path: ':slug',
        loadComponent: () => import('../pages/docs/docs.page').then((m) => m.DocsPage),
      },
    ],
  },

  // Rotas Principais (Com Header/Footer)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [subdomainGuard, authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../pages/dashboard.page').then((m) => m.DashboardComponent),
        data: { maxWidth: '5xl' },
      },
      {
        path: 'accounts',
        loadComponent: () => import('../pages/accounts/accounts.page').then((m) => m.AccountsPage),
        data: { title: 'Contas', maxWidth: '7xl' },
      },
      {
        path: 'cards',
        loadComponent: () => import('../pages/cards/cards.page').then((m) => m.CardsPage),
        data: { title: 'Cartões', maxWidth: '7xl' },
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('../pages/transactions/transactions.page').then((m) => m.TransactionsPage),
        data: { title: 'Transações', maxWidth: '5xl' },
      },
      {
        path: 'transactions/new',
        loadComponent: () =>
          import('../pages/transactions/create-transaction.page').then(
            (m) => m.CreateTransactionPage,
          ),
        data: { title: 'Nova transação', maxWidth: '3xl' },
      },
      {
        path: 'admin/allowlist',
        loadComponent: () => import('../pages/admin/allowlist.page').then((m) => m.AllowlistPage),
        data: { title: 'Allowlist', requiredRole: 'ADMIN', maxWidth: '7xl' },
      },
      {
        path: 'profile',
        loadComponent: () => import('../pages/profile.page').then((m) => m.ProfilePage),
        data: { title: 'Meu Perfil', maxWidth: '3xl' },
      },
      {
        path: 'reports',
        loadComponent: () => import('../pages/reports/reports.page').then((m) => m.ReportsPage),
        data: { title: 'Relatórios', maxWidth: '5xl' },
      },
      // Outras rotas autenticadas virão aqui (accounts, reports, profile)
    ],
  },

  // Rota curinga
  {
    path: '**',
    redirectTo: 'login',
  },
];

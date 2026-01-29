import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';

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
    redirectTo: 'login',
    pathMatch: 'full',
  },

  // Rotas de Autenticação (Sem Header/Footer)
  {
    path: '',
    component: AuthLayoutComponent,
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
      // Futuro registro:
      // { path: 'register', ... }
    ],
  },

  // Rotas Principais (Com Header/Footer)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../pages/dashboard.page').then((m) => m.DashboardComponent),
      },
      {
        path: 'accounts',
        loadComponent: () => import('../pages/accounts/accounts.page').then((m) => m.AccountsPage),
        data: { title: 'Contas' },
      },
      {
        path: 'cards',
        loadComponent: () => import('../pages/cards/cards.page').then((m) => m.CardsPage),
        data: { title: 'Cartões' },
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('../pages/transactions/transactions.page').then((m) => m.TransactionsPage),
        data: { title: 'Transações' },
      },
      {
        path: 'transactions/new',
        loadComponent: () =>
          import('../pages/transactions/create-transaction.page').then(
            (m) => m.CreateTransactionPage,
          ),
        data: { title: 'Nova transação' },
      },
      {
        path: 'admin/allowlist',
        loadComponent: () => import('../pages/admin/allowlist.page').then((m) => m.AllowlistPage),
        data: { title: 'Allowlist', requiredRole: 'ADMIN' },
      },
      {
        path: 'profile',
        loadComponent: () => import('../pages/profile.page').then((m) => m.ProfilePage),
        data: { title: 'Meu Perfil' },
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

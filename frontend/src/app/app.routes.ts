import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

/**
 * @description
 * Configuração das rotas da aplicação Dindinho.
 * Define a hierarquia de navegação e os componentes associados a cada rota.
 *
 * @constant {Routes}
 */
export const routes: Routes = [
  // Rota padrão redireciona para o dashboard
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  // Login
  {
    path: 'login',
    loadComponent: () => import('../pages/login/login.page').then((m) => m.LoginComponent),
  },
  // Dashboard
  {
    path: 'dashboard',
    loadComponent: () => import('../pages/dashboard.page').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  // Rota curinga para tratamento de rotas não encontradas
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

import { Routes } from '@angular/router';
import { DashboardComponent } from '../pages/dashboard';

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
    pathMatch: 'full' 
  },
  // Dashboard
  { 
    path: 'dashboard', 
    component: DashboardComponent 
  },
  // Rota curinga para tratamento de rotas não encontradas
  { 
    path: '**', 
    redirectTo: 'dashboard' 
  }
];
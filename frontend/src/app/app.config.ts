/**
 * Configuração principal da aplicação Angular.
 *
 * Este arquivo contém as configurações globais da aplicação, incluindo:
 * - Provedores de serviços globais
 * - Configurações de roteamento
 * - Configurações de temas e estilos
 * - Interceptores e manipuladores globais
 *
 * @module AppConfig
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor'; // Importe o interceptor criado

/**
 * Configuração principal da aplicação.
 *
 * @constant {ApplicationConfig} appConfig
 * @property {Array} providers - Lista de provedores de serviços globais
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Habilita o tratamento global de erros
    provideBrowserGlobalErrorListeners(),

    // Configuração do roteador com as rotas definidas
    provideRouter(routes),

    // Configuração do HttpClient com Fetch
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // Configuração do PrimeNG com o tema Aura
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
    }),
  ],
};

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

import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { provideMarkdown } from 'ngx-markdown';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { httpErrorInterceptor } from './interceptors/error.interceptor';
import { GlobalErrorHandler } from './services/global-error-handler.service';

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

    // Handler global customizado para erros não capturados
    { provide: ErrorHandler, useClass: GlobalErrorHandler },

    // Serviço de mensagens do PrimeNG para Toasts
    MessageService,

    // Configuração do roteador com as rotas definidas
    provideRouter(routes),

    // Configuração do HttpClient com Fetch e interceptores
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, httpErrorInterceptor])),

    // Configuração do Markdown para renderização de documentação
    provideMarkdown(),

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

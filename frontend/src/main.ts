/**
 * @file Arquivo de inicialização principal da aplicação Dindinho.
 * Este é o primeiro ponto de execução do aplicativo Angular.
 *
 * Responsabilidades:
 * - Importa e configura o módulo raiz da aplicação
 * - Inicializa a aplicação com as configurações fornecidas
 * - Trata erros iniciais de inicialização
 *
 * @module main
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/**
 * Inicializa a aplicação Angular com as configurações fornecidas.
 *
 * @example
 * bootstrapApplication(App, appConfig)
 *   .catch(err => {});
 */
bootstrapApplication(App, appConfig).catch((err) => {
  throw err;
});

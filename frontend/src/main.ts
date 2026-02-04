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

// Import PrismJS for syntax highlighting in documentation
import 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import 'prismjs/plugins/line-numbers/prism-line-numbers';

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

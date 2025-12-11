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
 * @function
 * @name bootstrap
 * @param {Type<any>} App - O componente raiz da aplicação
 * @param {ApplicationConfig} appConfig - Configurações da aplicação
 * @returns {Promise<ApplicationRef>} Referência à aplicação inicializada
 * 
 * @example
 * bootstrapApplication(App, appConfig)
 *   .catch(err => console.error('Falha na inicialização:', err));
 */
bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error('Falha na inicialização da aplicação:', err);
    // Aqui poderiamos adicionar lógica adicional de tratamento de erro,
    // como enviar para um serviço de monitoramento
  });

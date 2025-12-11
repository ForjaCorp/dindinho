/**
 * @file Configuração do Vitest para testes unitários e de integração
 * @description Define a configuração do ambiente de testes do backend
 * @module vitest.config
 */

import { defineConfig } from "vitest/config";

/**
 * Configuração do Vitest para execução de testes
 * @type {import('vitest/config').UserConfig}
 */
export default defineConfig({
  test: {
    /**
     * Padrão de arquivos de teste a serem incluídos
     * @type {string[]}
     */
    include: ["src/**/*.spec.ts"],

    /**
     * Diretórios a serem ignorados nos testes
     * @type {string[]}
     */
    exclude: ["dist/**", "node_modules/**"],

    /**
     * Ambiente de execução dos testes
     * @type {'node'|'jsdom'|'happy-dom'|'edge-runtime'|string}
     */
    environment: "node",

    /**
     * Habilita variáveis globais como 'describe', 'it', 'expect'
     * @type {boolean}
     */
    globals: true,
  },
});

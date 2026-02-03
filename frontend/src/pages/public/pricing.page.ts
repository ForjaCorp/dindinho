import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * @description
 * Página de Preços.
 * Pública e acessível sem autenticação.
 */
@Component({
  selector: 'app-pricing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div data-testid="pricing-page" class="max-w-6xl mx-auto py-16 px-6">
      <header class="text-center mb-16">
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Planos Simples e Transparentes</h1>
        <p class="text-slate-500 text-lg">
          Escolha o plano que melhor se adapta ao seu momento financeiro.
        </p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <!-- Plano Grátis -->
        <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col">
          <div class="mb-8">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Básico</h3>
            <p class="text-slate-500 text-sm">Para quem está começando a se organizar.</p>
          </div>
          <div class="mb-8">
            <span class="text-4xl font-bold text-slate-900">R$ 0</span>
            <span class="text-slate-500">/mês</span>
          </div>
          <ul class="space-y-4 mb-8 flex-1">
            <li class="flex items-center gap-2 text-sm text-slate-600">
              <span class="text-emerald-500">✓</span> Até 2 contas bancárias
            </li>
            <li class="flex items-center gap-2 text-sm text-slate-600">
              <span class="text-emerald-500">✓</span> Controle de gastos mensais
            </li>
            <li class="flex items-center gap-2 text-sm text-slate-600">
              <span class="text-emerald-500">✓</span> Categorias básicas
            </li>
          </ul>
          <a
            routerLink="/signup"
            class="block text-center py-3 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Começar Grátis
          </a>
        </div>

        <!-- Plano Pro -->
        <div
          class="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col relative overflow-hidden"
        >
          <div
            class="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
          >
            Popular
          </div>
          <div class="mb-8">
            <h3 class="text-xl font-bold text-white mb-2">Pro</h3>
            <p class="text-slate-400 text-sm">Controle total para sua vida financeira.</p>
          </div>
          <div class="mb-8">
            <span class="text-4xl font-bold text-white">R$ 19</span>
            <span class="text-slate-400">/mês</span>
          </div>
          <ul class="space-y-4 mb-8 flex-1">
            <li class="flex items-center gap-2 text-sm text-slate-300">
              <span class="text-emerald-400">✓</span> Contas ilimitadas
            </li>
            <li class="flex items-center gap-2 text-sm text-slate-300">
              <span class="text-emerald-400">✓</span> Múltiplos cartões de crédito
            </li>
            <li class="flex items-center gap-2 text-sm text-slate-300">
              <span class="text-emerald-400">✓</span> Relatórios detalhados e exportação
            </li>
            <li class="flex items-center gap-2 text-sm text-slate-300">
              <span class="text-emerald-400">✓</span> Suporte prioritário
            </li>
          </ul>
          <a
            routerLink="/signup"
            class="block text-center py-3 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20"
          >
            Assinar Pro
          </a>
        </div>
      </div>
    </div>
  `,
})
export class PricingPage {}

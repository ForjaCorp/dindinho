import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * @description
 * Página de Onboarding/Como funciona.
 * Pública e acessível sem autenticação.
 */
@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div data-testid="onboarding-page" class="max-w-5xl mx-auto py-16 px-6">
      <header class="text-center mb-16">
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Como o Dindinho Funciona</h1>
        <p class="text-slate-500 text-lg">Organize sua vida financeira em 3 passos simples.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div class="text-center">
          <div
            class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6"
          >
            1
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">Cadastre-se</h3>
          <p class="text-sm text-slate-500">
            Crie sua conta em segundos e comece a configurar seu perfil financeiro.
          </p>
        </div>

        <div class="text-center">
          <div
            class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6"
          >
            2
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">Adicione suas Contas</h3>
          <p class="text-sm text-slate-500">
            Insira suas contas bancárias e cartões para ter uma visão unificada.
          </p>
        </div>

        <div class="text-center">
          <div
            class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6"
          >
            3
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">Acompanhe e Economize</h3>
          <p class="text-sm text-slate-500">
            Veja para onde seu dinheiro está indo e identifique oportunidades de economia.
          </p>
        </div>
      </div>

      <div class="mt-20 bg-slate-900 rounded-3xl p-12 text-center text-white">
        <h2 class="text-2xl font-bold mb-4">Pronto para assumir o controle?</h2>
        <p class="text-slate-400 mb-8 max-w-md mx-auto">
          Junte-se a milhares de pessoas que já simplificaram suas finanças com o Dindinho.
        </p>
        <a
          routerLink="/signup"
          class="inline-block bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/40"
        >
          Começar Agora
        </a>
      </div>
    </div>
  `,
})
export class OnboardingPage {}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * @description
 * Página de Perguntas Frequentes (FAQ).
 * Pública e acessível sem autenticação.
 */
@Component({
  selector: 'app-faq-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div data-testid="faq-page" class="max-w-3xl mx-auto py-16 px-6">
      <header class="text-center mb-16">
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Perguntas Frequentes</h1>
        <p class="text-slate-500 text-lg">
          Tudo o que você precisa saber sobre o Dindinho e como ele ajuda na sua organização
          financeira.
        </p>
      </header>

      <div class="space-y-8">
        <section class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 class="text-lg font-semibold text-slate-800 mb-2">O Dindinho é gratuito?</h3>
          <p class="text-slate-600 leading-relaxed">
            Oferecemos um plano gratuito generoso para controle básico. Para recursos avançados como
            múltiplos cartões e relatórios detalhados, temos o plano Pro.
          </p>
        </section>

        <section class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 class="text-lg font-semibold text-slate-800 mb-2">Meus dados estão seguros?</h3>
          <p class="text-slate-600 leading-relaxed">
            Sim, utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de
            segurança para garantir que suas informações financeiras permaneçam privadas.
          </p>
        </section>

        <section class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 class="text-lg font-semibold text-slate-800 mb-2">
            Posso importar dados de outros bancos?
          </h3>
          <p class="text-slate-600 leading-relaxed">
            Atualmente suportamos importação via CSV e estamos trabalhando em integrações
            automáticas via Open Banking.
          </p>
        </section>
      </div>
    </div>
  `,
})
export class FAQPage {}

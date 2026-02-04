import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * @description
 * Página de Política de Privacidade.
 * Pública e acessível sem autenticação.
 */
@Component({
  selector: 'app-privacy-policy-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div data-testid="privacy-policy-page" class="max-w-3xl mx-auto py-16 px-6">
      <header class="mb-12">
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Política de Privacidade</h1>
        <p class="text-slate-500">Última atualização: 3 de Fevereiro de 2026</p>
      </header>

      <div class="prose prose-slate max-w-none">
        <section class="mb-8">
          <h2 class="text-xl font-bold text-slate-800 mb-4">1. Coleta de Dados</h2>
          <p class="text-slate-600 mb-4">
            Coletamos apenas as informações necessárias para o funcionamento do serviço, como e-mail
            para login e os dados financeiros que você optar por inserir.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-slate-800 mb-4">2. Uso das Informações</h2>
          <p class="text-slate-600 mb-4">
            Seus dados são utilizados exclusivamente para gerar seus relatórios e fornecer insights
            sobre sua saúde financeira. Não vendemos seus dados para terceiros.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-slate-800 mb-4">3. Segurança</h2>
          <p class="text-slate-600 mb-4">
            Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados
            contra acesso não autorizado, alteração ou destruição.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-slate-800 mb-4">4. Seus Direitos</h2>
          <p class="text-slate-600 mb-4">
            Você tem o direito de acessar, corrigir ou excluir seus dados a qualquer momento através
            das configurações da sua conta.
          </p>
        </section>
      </div>
    </div>
  `,
})
export class PrivacyPolicyPage {}

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../app/services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 flex flex-col gap-6">
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 class="text-xl font-bold text-slate-800 mb-2">Perfil</h2>
        <p class="text-slate-600 mb-6">
          Olá,
          <span data-testid="user-name" class="font-semibold text-emerald-600">{{
            auth.currentUser()?.name
          }}</span
          >!
        </p>

        <button
          data-testid="logout-button"
          (click)="auth.logout()"
          class="w-full py-3 px-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <i class="pi pi-sign-out"></i>
          Sair da conta
        </button>
      </div>

      <div
        data-testid="docs-entry"
        class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
      >
        <h3 class="text-sm font-semibold text-slate-800 mb-2">Documentação</h3>
        <p class="text-sm text-slate-600 mb-4">Acesse o portal interno de docs do monorepo.</p>

        <button
          data-testid="open-docs"
          (click)="openDocs()"
          class="w-full py-3 px-4 bg-slate-50 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
        >
          <i class="pi pi-book"></i>
          Abrir Docs
        </button>
      </div>

      <p class="text-xs text-slate-500 text-center" data-testid="app-version">
        Dindinho v1.0.0-dev
      </p>
    </div>
  `,
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);

  /**
   * Redireciona para o subdomínio de documentação.
   * Garante que a transição entre app e docs ocorra via mudança de domínio.
   */
  openDocs(): void {
    const origin = window.location.origin;

    // Em localhost, precisamos garantir que o token esteja disponível para o subdomínio docs.
    // Como o localStorage não é compartilhado, e o cookie pode falhar em alguns navegadores,
    // anexamos o token na URL se estivermos em desenvolvimento.
    const token = this.auth.getAccessToken();
    const isLocalhost = origin.includes('localhost');

    const docsOrigin = origin.replace('://', '://docs.');
    let targetUrl = `${docsOrigin}/docs`;

    if (isLocalhost && token) {
      // Usa fragmento para passar o token de forma mais segura que query param (não vai pro log do servidor)
      targetUrl += `#access_token=${token}`;
    }

    window.location.href = targetUrl;
  }
}

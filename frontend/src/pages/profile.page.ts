import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../app/services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 flex flex-col gap-6">
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 class="text-xl font-bold text-slate-800 mb-2">Perfil</h2>
        <p class="text-slate-600 mb-6">
          Olá, <span class="font-semibold text-emerald-600">{{ auth.currentUser()?.name }}</span
          >!
        </p>

        <button
          data-testid="logout-button"
          class="w-full py-3 px-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <i class="pi pi-sign-out"></i>
          Sair da conta
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
}

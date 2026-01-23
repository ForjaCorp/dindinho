import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ApiResponseDTO } from '@dindinho/shared';

@Component({
  selector: 'app-backend-status-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `
    <div
      data-testid="backend-status-card"
      class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
    >
      <h3 class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
        <i class="pi pi-server text-emerald-500"></i> Status do Backend
      </h3>

      @if (apiData(); as data) {
        <div class="text-xs text-slate-600">
          <p class="font-medium text-emerald-600">{{ data.message }}</p>
          <p class="mt-1 opacity-70">{{ data.docs }}</p>
        </div>
      } @else if (error()) {
        <div class="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
          Erro ao conectar: Backend offline?
        </div>
      } @else {
        <div class="text-xs text-slate-400 animate-pulse">Conectando ao servidor...</div>
      }
    </div>
  `,
})
export class BackendStatusCardComponent {
  readonly apiData = input<ApiResponseDTO | null>(null);
  readonly error = input<string | null>(null);
}

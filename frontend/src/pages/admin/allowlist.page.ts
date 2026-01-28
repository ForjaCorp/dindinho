import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { AllowlistService } from '../../app/services/allowlist.service';

@Component({
  selector: 'app-allowlist-admin-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    PageHeaderComponent,
    DatePipe,
  ],
  host: {
    class: 'block',
  },
  template: `
    <div data-testid="allowlist-admin-page" class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <app-page-header
        title="Allowlist de Cadastro"
        subtitle="Gerencie os emails liberados para criar conta"
      >
        <p-button
          page-header-actions
          data-testid="reload-btn"
          label="Recarregar"
          icon="pi pi-refresh"
          [disabled]="allowlist.isLoading() || !allowlist.adminKey()"
          (onClick)="onReload()"
        />
      </app-page-header>

      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div class="flex-1 min-w-0">
            <label class="text-sm font-medium text-slate-700" for="adminKey">Chave Admin</label>
            <input
              id="adminKey"
              data-testid="admin-key-input"
              type="password"
              class="h-11 w-full rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              [formControl]="adminKeyControl"
              autocomplete="off"
              aria-label="Chave administrativa de allowlist"
            />
          </div>

          <p-button
            data-testid="admin-key-save-btn"
            label="Salvar Chave"
            icon="pi pi-lock"
            [disabled]="!adminKeyDraft().trim().length"
            (onClick)="onSaveAdminKey()"
            aria-label="Salvar chave administrativa"
          />
        </div>

        @if (!allowlist.adminKey()) {
          <div class="rounded-xl bg-amber-50 text-amber-700 border border-amber-200 p-3 text-sm">
            Informe a chave admin para carregar e gerenciar a allowlist.
          </div>
        }

        <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div class="flex-1 min-w-0">
            <label class="text-sm font-medium text-slate-700" for="email">Adicionar email</label>
            <input
              id="email"
              data-testid="allowlist-add-email-input"
              type="email"
              class="h-11 w-full rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="user@example.com"
              [formControl]="emailControl"
              autocomplete="off"
              aria-label="Email para adicionar na allowlist"
            />
          </div>
          <p-button
            data-testid="allowlist-add-email-btn"
            label="Adicionar"
            icon="pi pi-plus"
            [disabled]="!canAddEmail() || allowlist.isLoading()"
            (onClick)="onAddEmail()"
            aria-label="Adicionar email na allowlist"
          />
        </div>

        @if (allowlist.error()) {
          <div class="rounded-xl bg-red-50 text-red-700 border border-red-100 p-3 text-sm">
            {{ allowlist.error() }}
          </div>
        }
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="p-3 flex items-center gap-2">
          <input
            data-testid="allowlist-search"
            type="text"
            class="h-10 w-full sm:w-64 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Filtrar por email"
            [formControl]="searchControl"
            autocomplete="off"
            aria-label="Pesquisar por email"
          />
        </div>

        <p-table
          data-testid="allowlist-table"
          [value]="filteredItems()"
          [tableStyle]="{ 'min-width': '40rem' }"
          styleClass="!border-t !border-slate-100"
        >
          <ng-template pTemplate="header">
            <tr>
              <th class="text-left">Email</th>
              <th class="text-left">Criado em</th>
              <th class="text-right">Ações</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr [attr.data-testid]="'allowlist-row-' + row.id">
              <td class="text-slate-800">{{ row.email }}</td>
              <td class="text-slate-500">{{ row.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td class="text-right">
                <p-button
                  [attr.data-testid]="'allowlist-delete-btn-' + row.id"
                  icon="pi pi-trash"
                  severity="danger"
                  [rounded]="true"
                  [text]="true"
                  (onClick)="onDeleteEmail(row.email)"
                  aria-label="Remover email da allowlist"
                />
              </td>
            </tr>
          </ng-template>
        </p-table>

        @if (!allowlist.isLoading() && filteredItems().length === 0) {
          <div class="p-4 text-sm text-slate-500">Nenhum item encontrado.</div>
        }
      </div>
    </div>
  `,
})
export class AllowlistPage implements OnInit {
  protected readonly allowlist = inject(AllowlistService);

  protected readonly adminKeyControl = new FormControl(this.allowlist.adminKey() ?? '', {
    nonNullable: true,
  });
  protected readonly emailControl = new FormControl('', { nonNullable: true });
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly adminKeyDraft = toSignal(this.adminKeyControl.valueChanges, {
    initialValue: this.adminKeyControl.value,
  });
  protected readonly emailDraft = toSignal(this.emailControl.valueChanges, {
    initialValue: this.emailControl.value,
  });
  protected readonly searchDraft = toSignal(this.searchControl.valueChanges, {
    initialValue: this.searchControl.value,
  });

  protected readonly filteredItems = computed(() => {
    const q = this.searchDraft().trim().toLowerCase();
    const items = this.allowlist.items();
    if (!q) return items;
    return items.filter((i) => i.email.toLowerCase().includes(q));
  });

  ngOnInit() {
    if (this.allowlist.adminKey()) {
      this.allowlist.loadAllowlist();
    }
  }

  protected onSaveAdminKey() {
    const key = this.adminKeyControl.value.trim();
    this.allowlist.setAdminKey(key);
    if (key) this.allowlist.loadAllowlist();
  }

  protected onReload() {
    this.allowlist.loadAllowlist();
  }

  protected canAddEmail() {
    const email = this.emailDraft().trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  protected onAddEmail() {
    if (!this.canAddEmail()) return;
    const email = this.emailControl.value.trim();
    this.allowlist.addEmail(email).subscribe({
      next: () => this.emailControl.setValue(''),
      error: () => undefined,
    });
  }

  protected onDeleteEmail(email: string) {
    this.allowlist.deleteEmail(email).subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }
}

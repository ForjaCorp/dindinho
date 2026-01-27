import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { ApiService, AllowlistDeleteResponse, AllowlistItem } from './api.service';

interface AllowlistState {
  items: AllowlistItem[];
  loading: boolean;
  error: string | null;
  adminKey: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AllowlistService {
  private readonly storageKey = 'dindinho_admin_key';
  private api = inject(ApiService);

  private state = signal<AllowlistState>({
    items: [],
    loading: false,
    error: null,
    adminKey: this.getStoredKey(),
  });

  readonly items = computed(() => this.state().items);
  readonly isLoading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly adminKey = computed(() => this.state().adminKey);

  setAdminKey(value: string): void {
    const normalized = value.trim();
    const nextValue = normalized.length > 0 ? normalized : null;
    this.updateState({ adminKey: nextValue });

    if (typeof localStorage !== 'undefined') {
      if (nextValue) {
        localStorage.setItem(this.storageKey, nextValue);
      } else {
        localStorage.removeItem(this.storageKey);
      }
    }
  }

  loadAllowlist(): void {
    const adminKey = this.adminKey();
    if (!adminKey) {
      this.updateState({ error: 'Chave admin obrigatória' });
      return;
    }

    this.updateState({ loading: true, error: null });

    this.api
      .getAllowlist(adminKey)
      .pipe(
        finalize(() => this.updateState({ loading: false })),
        tap({
          next: (items) => this.updateState({ items }),
          error: (err) => this.updateState({ error: this.mapHttpError(err) }),
        }),
      )
      .subscribe({
        error: () => undefined,
      });
  }

  addEmail(email: string): Observable<AllowlistItem> {
    const adminKey = this.adminKey();
    if (!adminKey) {
      const err = new Error('Chave admin obrigatória');
      this.updateState({ error: err.message });
      return throwError(() => err);
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      const err = new Error('Email é obrigatório');
      this.updateState({ error: err.message });
      return throwError(() => err);
    }

    this.updateState({ loading: true, error: null });

    return this.api.addAllowlistEmail(adminKey, normalizedEmail).pipe(
      finalize(() => this.updateState({ loading: false })),
      tap({
        next: (item) => {
          const items = this.state().items.filter((current) => current.email !== item.email);
          this.updateState({ items: [item, ...items] });
        },
        error: (err) => this.updateState({ error: this.mapHttpError(err) }),
      }),
    );
  }

  deleteEmail(email: string): Observable<AllowlistDeleteResponse> {
    const adminKey = this.adminKey();
    if (!adminKey) {
      const err = new Error('Chave admin obrigatória');
      this.updateState({ error: err.message });
      return throwError(() => err);
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      const err = new Error('Email é obrigatório');
      this.updateState({ error: err.message });
      return throwError(() => err);
    }

    this.updateState({ loading: true, error: null });

    return this.api.deleteAllowlistEmail(adminKey, normalizedEmail).pipe(
      finalize(() => this.updateState({ loading: false })),
      tap({
        next: (response) => {
          if (!response.deleted) return;
          this.updateState({
            items: this.state().items.filter((item) => item.email !== normalizedEmail),
          });
        },
        error: (err) => this.updateState({ error: this.mapHttpError(err) }),
      }),
    );
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  private updateState(partial: Partial<AllowlistState>): void {
    this.state.update((current) => ({ ...current, ...partial }));
  }

  private getStoredKey(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return null;
    const normalized = stored.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private mapHttpError(err: unknown): string {
    const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : undefined;
    const status =
      typeof errObj?.['status'] === 'number' ? (errObj['status'] as number) : undefined;
    const errorValue = errObj?.['error'];
    const errorObj =
      errorValue && typeof errorValue === 'object'
        ? (errorValue as Record<string, unknown>)
        : undefined;
    const message =
      typeof errorObj?.['message'] === 'string' ? (errorObj['message'] as string) : undefined;

    if (status === 0) return 'Erro de conexão. Verifique sua internet.';
    if (status === 401) return 'Chave admin inválida.';
    if (status === 503) return 'Chave admin não configurada.';
    if (typeof status === 'number' && status >= 500) {
      return 'Erro no servidor. Tente novamente mais tarde.';
    }

    return message ?? 'Ocorreu um erro inesperado.';
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { CategoryDTO } from '@dindinho/shared';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private api = inject(ApiService);

  categories = signal<CategoryDTO[]>([]);
  loading = signal(false);
  loaded = signal(false);

  loadCategories(force = false) {
    if (this.loaded() && !force) return;

    this.loading.set(true);
    this.api
      .getCategories()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          this.loaded.set(true);
        },
        error: () => {
          console.error('Erro ao carregar categorias');
        },
      });
  }

  getCategoryName(id: string | null | undefined): string {
    if (!id) return 'Sem Categoria';
    const category = this.categories().find((c) => c.id === id);
    return category ? category.name : 'Sem Categoria';
  }
}

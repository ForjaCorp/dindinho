import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface OpenApiInfo {
  title: string;
  version: string;
}

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
}

export interface OpenApiDocument {
  openapi: string;
  info: OpenApiInfo;
  tags?: OpenApiTag[];
  paths: Record<string, Record<string, OpenApiOperation>>;
}

/**
 * Serviço para leitura de documentos do portal a partir de assets estáticos.
 */
@Injectable({
  providedIn: 'root',
})
export class DocsService {
  private readonly http = inject(HttpClient);

  private readonly bundledOpenApiJsonUrl = '/assets/docs/30-api/openapi.json';

  /**
   * Carrega um arquivo Markdown do diretório `docs/` empacotado como asset.
   * @param relativePath Caminho relativo dentro do `docs/` (ex.: `30-api/authentication.md`).
   */
  getMarkdown(relativePath: string): Observable<string> {
    const normalizedPath = this.normalizeRelativeDocPath(relativePath);
    if (!normalizedPath) {
      return throwError(() => new Error('Caminho de docs inválido'));
    }

    return this.http.get(`/assets/docs/${normalizedPath}`, {
      responseType: 'text',
    });
  }

  getOpenApiDoc(): Observable<OpenApiDocument> {
    return this.http
      .get<OpenApiDocument>(this.getOpenApiJsonUrl())
      .pipe(catchError(() => this.http.get<OpenApiDocument>(this.bundledOpenApiJsonUrl)));
  }

  getOpenApiJsonUrl(): string {
    const base = this.getApiBaseUrl();
    return `${base}/docs/json`;
  }

  getSwaggerUiUrl(): string {
    const base = this.getApiBaseUrl();
    return `${base}/docs`;
  }

  getRawDocUrl(relativePath: string): string | null {
    const normalizedPath = this.normalizeRelativeDocPath(relativePath);
    if (!normalizedPath) return null;
    return `/assets/docs/${normalizedPath}`;
  }

  private getApiBaseUrl(): string {
    const url = environment.apiUrl;
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  private normalizeRelativeDocPath(input: string): string | null {
    const raw = input.trim().replaceAll('\\', '/');
    const withoutLeadingSlash = raw.startsWith('/') ? raw.slice(1) : raw;

    if (withoutLeadingSlash.length === 0) return null;
    if (withoutLeadingSlash.includes('..')) return null;
    if (!withoutLeadingSlash.endsWith('.md')) return null;

    const safePath = withoutLeadingSlash
      .split('/')
      .filter((segment) => segment.length > 0)
      .join('/');

    if (safePath.length === 0) return null;
    return safePath;
  }
}

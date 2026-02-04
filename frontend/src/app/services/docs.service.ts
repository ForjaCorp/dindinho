import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** Informações básicas da especificação OpenAPI */
export interface OpenApiInfo {
  /** Título da API */
  title: string;
  /** Versão da API */
  version: string;
}

/** Representa uma tag OpenAPI */
export interface OpenApiTag {
  /** Nome da tag */
  name: string;
  /** Descrição opcional da tag */
  description?: string;
}

/** Representa uma operação individual no OpenAPI */
export interface OpenApiOperation {
  /** Resumo curto da operação */
  summary?: string;
  /** Descrição detalhada */
  description?: string;
  /** Identificador único */
  operationId?: string;
  /** Lista de tags associadas */
  tags?: string[];
}

/** Representa o documento OpenAPI completo */
export interface OpenApiDocument {
  /** Versão da especificação */
  openapi: string;
  /** Metadados da API */
  info: OpenApiInfo;
  /** Lista de tags */
  tags?: OpenApiTag[];
  /** Mapeamento de caminhos e métodos para operações */
  paths: Record<string, Record<string, OpenApiOperation>>;
}

/**
 * Serviço para leitura de documentos do portal a partir de assets estáticos ou da API.
 */
@Injectable({
  providedIn: 'root',
})
export class DocsService {
  private readonly http = inject(HttpClient);

  /** URL do asset local com a especificação OpenAPI empacotada */
  private readonly bundledOpenApiJsonUrl = '/assets/docs/30-api/openapi.json';

  /**
   * Carrega um arquivo do diretório `docs/` empacotado como asset.
   * Suporta arquivos Markdown (.md) e JSON (.json).
   *
   * @param relativePath - Caminho relativo do arquivo dentro de assets/docs/
   * @returns Observable com o conteúdo (string para MD, objeto para JSON)
   */
  getFile(relativePath: string): Observable<string | OpenApiDocument> {
    const normalizedPath = this.normalizeRelativeDocPath(relativePath);
    if (!normalizedPath) {
      return throwError(() => new Error('Caminho de docs inválido'));
    }

    if (normalizedPath.endsWith('.json')) {
      return this.http.get<OpenApiDocument>(`/assets/docs/${normalizedPath}`);
    }

    return this.http.get(`/assets/docs/${normalizedPath}`, {
      responseType: 'text',
    });
  }

  /**
   * Obtém a especificação OpenAPI atualizada.
   * Tenta carregar do backend primeiro e faz fallback para o asset local.
   *
   * @returns Observable com o documento OpenAPI
   */
  getOpenApi(): Observable<OpenApiDocument> {
    // Tenta carregar da API real primeiro, senão cai para o asset estático
    return this.http
      .get<OpenApiDocument>(this.getOpenApiJsonUrl())
      .pipe(catchError(() => this.http.get<OpenApiDocument>(this.bundledOpenApiJsonUrl)));
  }

  /**
   * Retorna a URL do endpoint que serve o JSON da especificação OpenAPI.
   * @returns URL absoluta do JSON OpenAPI
   */
  getOpenApiJsonUrl(): string {
    const base = this.getApiBaseUrl();
    return `${base}/docs/json`;
  }

  /**
   * Retorna a URL da interface interativa Swagger UI.
   * @returns URL absoluta do Swagger UI
   */
  getSwaggerUiUrl(): string {
    const base = this.getApiBaseUrl();
    return `${base}/docs`;
  }

  /**
   * Constrói a URL direta para um documento bruto.
   * @param relativePath - Caminho relativo do documento
   * @returns URL do asset ou null se o caminho for inválido
   */
  getRawDocUrl(relativePath: string): string | null {
    const normalizedPath = this.normalizeRelativeDocPath(relativePath);
    if (!normalizedPath) return null;
    return `/assets/docs/${normalizedPath}`;
  }

  /**
   * Obtém a URL base da API a partir das configurações de ambiente.
   * @returns URL base normalizada
   */
  private getApiBaseUrl(): string {
    const url = environment.apiUrl;
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Normaliza e valida um caminho de documento para evitar ataques de traversal
   * e garantir extensões permitidas.
   *
   * @param input - Caminho bruto de entrada
   * @returns Caminho normalizado ou null se for inválido/inseguro
   */
  private normalizeRelativeDocPath(input: string): string | null {
    const raw = input.trim().replaceAll('\\', '/');
    const withoutLeadingSlash = raw.startsWith('/') ? raw.slice(1) : raw;

    if (withoutLeadingSlash.length === 0) return null;
    if (withoutLeadingSlash.includes('..')) return null;
    if (!withoutLeadingSlash.endsWith('.md') && !withoutLeadingSlash.endsWith('.json')) return null;

    const safePath = withoutLeadingSlash
      .split('/')
      .filter((segment) => segment.length > 0)
      .join('/');

    if (safePath.length === 0) return null;
    return safePath;
  }
}

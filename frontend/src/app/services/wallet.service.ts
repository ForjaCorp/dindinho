import { Injectable, inject, signal, computed } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { CreateWalletDTO, WalletDTO } from '@dindinho/shared';
import { ApiService } from './api.service';

/**
 * Interface do estado de contas
 * @description Define a estrutura do estado reativo do serviço de contas
 */
interface WalletState {
  /** Lista de contas do usuário */
  wallets: WalletDTO[];
  /** Indica se operação está em andamento */
  loading: boolean;
  /** Mensagem de erro da última operação */
  error: string | null;
}

/**
 * Serviço responsável pelo gerenciamento de estado das contas
 * @description Serviço que gerencia o estado reativo das contas usando Signals
 * @since 1.0.0
 * @example
 * // Injetar e usar no componente
 * constructor(private walletService: WalletService) {}
 *
 * // Acessar contas reativas
 * const wallets = this.walletService.wallets();
 *
 * // Carregar contas
 * this.walletService.loadWallets();
 */

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private api = inject(ApiService);

  /**
   * Estado reativo privado das contas
   * @description Signal interno que mantém o estado completo das contas
   * @private
   */
  private state = signal<WalletState>({
    wallets: [],
    loading: false,
    error: null,
  });

  /**
   * Signal readonly para lista de contas
   * @description Retorna a lista atual de contas do usuário
   * @example
   * const wallets = this.walletService.wallets();
   */
  readonly wallets = computed(() => this.state().wallets);

  /**
   * Signal readonly para estado de carregamento
   * @description Indica se alguma operação está em andamento
   * @example
   * const isLoading = this.walletService.isLoading();
   */
  readonly isLoading = computed(() => this.state().loading);

  /**
   * Signal readonly para mensagem de erro
   * @description Retorna a mensagem de erro da última operação, se houver
   * @example
   * const error = this.walletService.error();
   */
  readonly error = computed(() => this.state().error);

  /**
   * Signal computado para saldo total
   * @description Soma dos saldos de todas as contas
   * @example
   * const total = this.walletService.totalBalance();
   */
  readonly totalBalance = computed(() =>
    this.wallets().reduce((acc, wallet) => acc + (wallet.balance || 0), 0),
  );

  /**
   * Signal computado para contas por tipo
   * @description Retorna contas agrupadas por tipo (STANDARD, CREDIT)
   * @example
   * const byType = this.walletService.walletsByType();
   */
  readonly walletsByType = computed(() => {
    const wallets = this.wallets();
    return {
      standard: wallets.filter((w) => w.type === 'STANDARD'),
      credit: wallets.filter((w) => w.type === 'CREDIT'),
    };
  });

  /**
   * Busca uma conta pelo ID
   * @description Retorna uma conta específica pelo seu ID
   * @param walletId - ID da conta a ser buscada
   * @returns Conta encontrada ou undefined se não existir
   * @example
   * const wallet = this.walletService.getWalletById('wallet-123');
   */
  getWalletById(walletId: string): WalletDTO | undefined {
    if (!walletId) {
      return undefined;
    }
    return this.wallets().find((w) => w.id === walletId);
  }

  /**
   * Busca contas por tipo
   * @description Retorna todas as contas de um tipo específico
   * @param type - Tipo das contas (STANDARD ou CREDIT)
   * @returns Array de contas do tipo especificado
   * @example
   * const creditCards = this.walletService.getWalletsByType('CREDIT');
   */
  getWalletsByType(type: WalletDTO['type']): WalletDTO[] {
    return this.wallets().filter((w) => w.type === type);
  }

  /**
   * Ordena contas por critério especificado
   * @description Retorna cópia ordenada das contas sem modificar estado
   * @param sortBy - Critério de ordenação (name, balance, type)
   * @param direction - Direção da ordenação (asc ou desc)
   * @returns Array de contas ordenado
   * @example
   * const sorted = this.walletService.sortWallets('balance', 'desc');
   */
  sortWallets(sortBy: 'name' | 'balance' | 'type', direction: 'asc' | 'desc' = 'asc'): WalletDTO[] {
    const wallets = [...this.wallets()];

    return wallets.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'balance':
          comparison = (a.balance || 0) - (b.balance || 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Filtra contas por critério de busca
   * @description Retorna contas que correspondem ao termo de busca
   * @param searchTerm - Termo para filtrar (busca em nome e tipo)
   * @returns Array de contas filtrado
   * @example
   * const filtered = this.walletService.filterWallets('nubank');
   */
  filterWallets(searchTerm: string): WalletDTO[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return [...this.wallets()];
    }

    const term = searchTerm.toLowerCase().trim();
    return this.wallets().filter(
      (wallet) =>
        wallet.name.toLowerCase().includes(term) || wallet.type.toLowerCase().includes(term),
    );
  }

  /**
   * Carrega as contas do servidor
   * @description Busca a lista de contas e atualiza o estado
   */
  loadWallets(): void {
    this.updateState({ loading: true, error: null });

    this.api
      .getWallets()
      .pipe(
        finalize(() => this.updateState({ loading: false })),
        tap({
          next: (wallets) => this.updateState({ wallets }),
          error: (err) =>
            this.updateState({
              wallets: [],
              error: this.mapHttpError(err, {
                defaultMessage: 'Erro ao carregar contas',
                validationFallback: 'Dados inválidos',
              }),
            }),
        }),
      )
      .subscribe();
  }

  /**
   * Cria uma nova conta
   * @description Envia os dados para criar uma nova conta e atualiza a lista
   * @param payload Dados da nova conta
   * @returns Observable com a conta criada
   */
  createWallet(payload: CreateWalletDTO): Observable<WalletDTO> {
    try {
      this.validateCreateWalletData(payload);
    } catch (error) {
      this.updateState({ loading: false, error: error instanceof Error ? error.message : 'Erro' });
      return throwError(() => error);
    }

    this.updateState({ loading: true, error: null });

    return this.api.createWallet(payload).pipe(
      finalize(() => this.updateState({ loading: false })),
      tap({
        next: (newWallet) => {
          const currentWallets = this.state().wallets;
          this.updateState({ wallets: [...currentWallets, newWallet] });
        },
        error: (err) =>
          this.updateState({
            error: this.mapHttpError(err, {
              defaultMessage: 'Erro ao criar conta',
              validationFallback: 'Dados inválidos',
            }),
          }),
      }),
    );
  }

  private mapHttpError(
    err: unknown,
    opts: { defaultMessage: string; validationFallback: string },
  ): string {
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
    if (status === 401) return 'Sessão expirada. Faça login novamente.';
    if (status === 400) return message ?? opts.validationFallback;
    if (status === 409) return message ?? opts.defaultMessage;
    if (typeof status === 'number' && status >= 500) {
      return 'Erro no servidor. Tente novamente mais tarde.';
    }

    return 'Ocorreu um erro inesperado.';
  }

  /**
   * Atualiza o estado parcialmente
   * @private
   */
  private updateState(partial: Partial<WalletState>): void {
    this.state.update((current) => ({ ...current, ...partial }));
  }

  /**
   * Limpa o estado de erro
   * @description Remove mensagem de erro do estado
   * @example
   * this.walletService.clearError();
   */
  clearError() {
    this.state.update((s) => ({ ...s, error: null }));
  }

  /**
   * Remove uma conta do estado local
   * @description Remove conta da lista local (não deleta no backend)
   * @param walletId - ID da conta a ser removida
   * @throws {Error} Quando walletId é inválido ou nulo
   * @example
   * this.walletService.removeWalletFromState('wallet-123');
   */
  removeWalletFromState(walletId: string) {
    if (!walletId || walletId.trim() === '') {
      throw new Error('ID da conta é obrigatório');
    }

    this.state.update((s) => ({
      ...s,
      wallets: s.wallets.filter((w) => w.id !== walletId),
    }));
  }

  /**
   * Valida dados de criação de conta
   * @description Verifica se dados são válidos antes de enviar para API
   * @param data - Dados da conta a ser validada
   * @returns true se válido, lança erro se inválido
   * @private
   * @throws {Error} Quando dados são inválidos
   */
  private validateCreateWalletData(data: CreateWalletDTO): boolean {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nome da conta é obrigatório');
    }

    if (data.name.length > 50) {
      throw new Error('Nome da conta deve ter no máximo 50 caracteres');
    }

    if (!data.color || data.color.trim() === '') {
      throw new Error('Cor da conta é obrigatória');
    }

    if (!data.icon || data.icon.trim() === '') {
      throw new Error('Ícone da conta é obrigatório');
    }

    if (!data.type || !['STANDARD', 'CREDIT'].includes(data.type)) {
      throw new Error('Tipo da conta deve ser STANDARD ou CREDIT');
    }

    // Verificar se nome já existe localmente
    const existingWallet = this.wallets().find(
      (w) => w.name.toLowerCase() === data.name.toLowerCase(),
    );

    if (existingWallet) {
      throw new Error('Já existe uma conta com este nome');
    }

    return true;
  }

  /**
   * Cria múltiplas contas em lote
   * @description Envia múltiplas contas para criação em lote
   * @param walletsData - Array com dados das contas a serem criadas
   * @throws {Error} Quando algum dado é inválido
   * @example
   * this.walletService.createMultipleWallets([
   *   { name: 'Conta 1', color: '#FF0000', icon: 'pi-wallet', type: 'STANDARD' },
   *   { name: 'Conta 2', color: '#00FF00', icon: 'pi-credit-card', type: 'CREDIT' }
   * ]);
   */
  createMultipleWallets(walletsData: CreateWalletDTO[]) {
    if (!Array.isArray(walletsData) || walletsData.length === 0) {
      this.state.update((s) => ({ ...s, error: 'Array de contas é obrigatório' }));
      return;
    }

    // Validar todas as contas antes de enviar
    for (const data of walletsData) {
      try {
        this.validateCreateWalletData(data);
      } catch (error) {
        this.state.update((s) => ({ ...s, error: (error as Error).message }));
        return;
      }
    }

    this.state.update((s) => ({ ...s, loading: true, error: null }));

    // Criar contas sequencialmente (poderia ser paralelo, mas sequencial é mais seguro)
    const createdWallets: WalletDTO[] = [];
    let currentIndex = 0;

    const createNext = () => {
      if (currentIndex >= walletsData.length) {
        // Todas criadas com sucesso
        this.state.update((s) => ({
          ...s,
          wallets: [...s.wallets, ...createdWallets],
          loading: false,
        }));
        return;
      }

      this.api
        .createWallet(walletsData[currentIndex])
        .pipe(
          finalize(() => {
            if (currentIndex >= walletsData.length - 1) {
              this.state.update((s) => ({ ...s, loading: false }));
            }
          }),
        )
        .subscribe({
          next: (newWallet) => {
            createdWallets.push(newWallet);
            currentIndex++;
            createNext();
          },
          error: (err) => {
            console.error('Erro ao criar conta em lote:', err);
            const errorMessage = this.extractErrorMessage(err);
            this.state.update((s) => ({ ...s, error: errorMessage, loading: false }));
          },
        });
    };

    createNext();
  }

  /**
   * Remove múltiplas contas do estado local
   * @description Remove várias contas da lista local pelo ID
   * @param walletIds - Array com IDs das contas a serem removidas
   * @throws {Error} Quando array é inválido ou vazio
   * @example
   * this.walletService.removeMultipleWalletsFromState(['wallet-1', 'wallet-2']);
   */
  removeMultipleWalletsFromState(walletIds: string[]) {
    if (!Array.isArray(walletIds) || walletIds.length === 0) {
      throw new Error('Array de IDs é obrigatório');
    }

    // Validar todos os IDs
    for (const id of walletIds) {
      if (!id || id.trim() === '') {
        throw new Error('ID da conta é obrigatório');
      }
    }

    this.state.update((s) => ({
      ...s,
      wallets: s.wallets.filter((w) => !walletIds.includes(w.id)),
    }));
  }

  /**
   * Atualiza dados de uma conta no estado local
   * @description Atualiza conta existente na lista local
   * @param updatedWallet - Dados atualizados da conta
   * @throws {Error} Quando updatedWallet é inválido ou incompleto
   * @throws {Error} Quando conta não foi encontrada no estado local
   * @example
   * this.walletService.updateWalletInState(updatedWallet);
   */
  updateWalletInState(updatedWallet: WalletDTO) {
    this.state.update((s) => ({
      ...s,
      wallets: s.wallets.map((w) => (w.id === updatedWallet.id ? updatedWallet : w)),
    }));
  }

  /**
   * Extrai mensagem de erro baseada no tipo de erro
   * @param err - Erro retornado pela API
   * @returns Mensagem de erro tratada
   * @private
   * @throws {Error} Quando o erro não tem formato esperado
   */
  private extractErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    // Erro de rede
    if (err.status === 0) {
      return 'Erro de conexão. Verifique sua internet.';
    }

    // Erro de autenticação
    if (err.status === 401) {
      return 'Sessão expirada. Faça login novamente.';
    }

    // Erro de validação
    if (err.status === 400) {
      return err.error?.message || 'Dados inválidos. Verifique as informações.';
    }

    // Nome duplicado
    if (err.status === 409) {
      return err.error?.message || 'Já existe uma conta com este nome.';
    }

    // Erro do servidor
    if (err.status && err.status >= 500) {
      return 'Erro no servidor. Tente novamente mais tarde.';
    }

    // Erro genérico
    return err.error?.message || 'Ocorreu um erro inesperado.';
  }
}

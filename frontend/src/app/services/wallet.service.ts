import { Injectable, inject, signal, computed } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { CreateWalletDTO, WalletDTO } from '@dindinho/shared';
import { ApiService } from './api.service';

/**
 * Interface do estado de carteiras
 * @description Define a estrutura do estado reativo do serviço de carteiras
 */
interface WalletState {
  /** Lista de carteiras do usuário */
  wallets: WalletDTO[];
  /** Indica se operação está em andamento */
  loading: boolean;
  /** Mensagem de erro da última operação */
  error: string | null;
}

/**
 * Serviço responsável pelo gerenciamento de estado das carteiras
 * @description Serviço que gerencia o estado reativo das carteiras usando Signals
 * @since 1.0.0
 * @example
 * // Injetar e usar no componente
 * constructor(private walletService: WalletService) {}
 *
 * // Acessar carteiras reativas
 * const wallets = this.walletService.wallets();
 *
 * // Carregar carteiras
 * this.walletService.loadWallets();
 */

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private api = inject(ApiService);

  /**
   * Estado reativo privado das carteiras
   * @description Signal interno que mantém o estado completo das carteiras
   * @private
   */
  private state = signal<WalletState>({
    wallets: [],
    loading: false,
    error: null,
  });

  /**
   * Signal readonly para lista de carteiras
   * @description Retorna a lista atual de carteiras do usuário
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
   * @description Soma dos saldos de todas as carteiras
   * @example
   * const total = this.walletService.totalBalance();
   */
  readonly totalBalance = computed(() =>
    this.wallets().reduce((acc, wallet) => acc + (wallet.balance || 0), 0),
  );

  /**
   * Signal computado para carteiras por tipo
   * @description Retorna carteiras agrupadas por tipo (STANDARD, CREDIT)
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
   * Busca uma carteira pelo ID
   * @description Retorna uma carteira específica pelo seu ID
   * @param walletId - ID da carteira a ser buscada
   * @returns Carteira encontrada ou undefined se não existir
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
   * Busca carteiras por tipo
   * @description Retorna todas as carteiras de um tipo específico
   * @param type - Tipo das carteiras (STANDARD ou CREDIT)
   * @returns Array de carteiras do tipo especificado
   * @example
   * const creditCards = this.walletService.getWalletsByType('CREDIT');
   */
  getWalletsByType(type: WalletDTO['type']): WalletDTO[] {
    return this.wallets().filter((w) => w.type === type);
  }

  /**
   * Ordena carteiras por critério especificado
   * @description Retorna cópia ordenada das carteiras sem modificar estado
   * @param sortBy - Critério de ordenação (name, balance, type)
   * @param direction - Direção da ordenação (asc ou desc)
   * @returns Array de carteiras ordenado
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
   * Filtra carteiras por critério de busca
   * @description Retorna carteiras que correspondem ao termo de busca
   * @param searchTerm - Termo para filtrar (busca em nome e tipo)
   * @returns Array de carteiras filtrado
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
   * Carrega as carteiras do backend e atualiza o estado
   * @description Busca todas as carteiras do usuário no backend e atualiza o estado local
   * @throws {Error} Erro de conexão quando não há acesso à internet
   * @throws {Error} Erro de autenticação quando a sessão expirou
   * @throws {Error} Erro de servidor quando há falha no backend
   * @example
   * this.walletService.loadWallets();
   */
  loadWallets() {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    this.api
      .getWallets()
      .pipe(finalize(() => this.state.update((s) => ({ ...s, loading: false }))))
      .subscribe({
        next: (wallets) => {
          this.state.update((s) => ({ ...s, wallets }));
        },
        error: (err) => {
          console.error('Erro ao carregar carteiras:', err);
          const errorMessage = this.extractErrorMessage(err);
          this.state.update((s) => ({ ...s, error: errorMessage }));
        },
      });
  }

  /**
   * Cria uma nova carteira e atualiza o estado local.
   * Retorna o Observable para que o componente possa reagir ao sucesso/erro.
   *
   * @param data - Dados da carteira a ser criada
   * @returns Observable<WalletDTO> - Observable com a carteira criada
   *
   * @example
   * this.walletService.createWallet({
   *   name: 'Nova Carteira',
   *   color: '#FF5722',
   *   icon: 'pi-wallet',
   *   type: 'STANDARD'
   * }).subscribe({
   *   next: (wallet) => console.log('Sucesso:', wallet),
   *   error: (err) => console.error('Erro:', err)
   * });
   */
  createWallet(data: CreateWalletDTO): Observable<WalletDTO> {
    // 1. Validação Síncrona
    try {
      this.validateCreateWalletData(data);
    } catch (error) {
      const msg = (error as Error).message;
      this.state.update((s) => ({ ...s, error: msg }));
      // Retorna um erro observável para o componente saber que falhou imediatamente
      return throwError(() => new Error(msg));
    }

    // 2. Preparação do Estado (Loading)
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    // 3. Chamada API com Efeitos Colaterais (Tap)
    return this.api.createWallet(data).pipe(
      tap({
        next: (newWallet) => {
          // Sucesso: Atualiza o Signal de wallets
          this.state.update((s) => ({
            ...s,
            wallets: [...s.wallets, newWallet],
            loading: false,
          }));
        },
        error: (err) => {
          // Erro: Atualiza o Signal de erro e loading
          console.error('Erro ao criar carteira:', err);
          const errorMessage = this.extractErrorMessage(err);
          this.state.update((s) => ({
            ...s,
            error: errorMessage,
            loading: false,
          }));
        },
      }),
    );
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
   * Remove uma carteira do estado local
   * @description Remove carteira da lista local (não deleta no backend)
   * @param walletId - ID da carteira a ser removida
   * @throws {Error} Quando walletId é inválido ou nulo
   * @example
   * this.walletService.removeWalletFromState('wallet-123');
   */
  removeWalletFromState(walletId: string) {
    if (!walletId || walletId.trim() === '') {
      throw new Error('ID da carteira é obrigatório');
    }

    this.state.update((s) => ({
      ...s,
      wallets: s.wallets.filter((w) => w.id !== walletId),
    }));
  }

  /**
   * Valida dados de criação de carteira
   * @description Verifica se dados são válidos antes de enviar para API
   * @param data - Dados da carteira a ser validada
   * @returns true se válido, lança erro se inválido
   * @private
   * @throws {Error} Quando dados são inválidos
   */
  private validateCreateWalletData(data: CreateWalletDTO): boolean {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nome da carteira é obrigatório');
    }

    if (data.name.length > 50) {
      throw new Error('Nome da carteira deve ter no máximo 50 caracteres');
    }

    if (!data.color || data.color.trim() === '') {
      throw new Error('Cor da carteira é obrigatória');
    }

    if (!data.icon || data.icon.trim() === '') {
      throw new Error('Ícone da carteira é obrigatório');
    }

    if (!data.type || !['STANDARD', 'CREDIT'].includes(data.type)) {
      throw new Error('Tipo da carteira deve ser STANDARD ou CREDIT');
    }

    // Verificar se nome já existe localmente
    const existingWallet = this.wallets().find(
      (w) => w.name.toLowerCase() === data.name.toLowerCase(),
    );

    if (existingWallet) {
      throw new Error('Já existe uma carteira com este nome');
    }

    return true;
  }

  /**
   * Cria múltiplas carteiras em lote
   * @description Envia múltiplas carteiras para criação em lote
   * @param walletsData - Array com dados das carteiras a serem criadas
   * @throws {Error} Quando algum dado é inválido
   * @example
   * this.walletService.createMultipleWallets([
   *   { name: 'Carteira 1', color: '#FF0000', icon: 'pi-wallet', type: 'STANDARD' },
   *   { name: 'Carteira 2', color: '#00FF00', icon: 'pi-credit-card', type: 'CREDIT' }
   * ]);
   */
  createMultipleWallets(walletsData: CreateWalletDTO[]) {
    if (!Array.isArray(walletsData) || walletsData.length === 0) {
      this.state.update((s) => ({ ...s, error: 'Array de carteiras é obrigatório' }));
      return;
    }

    // Validar todas as carteiras antes de enviar
    for (const data of walletsData) {
      try {
        this.validateCreateWalletData(data);
      } catch (error) {
        this.state.update((s) => ({ ...s, error: (error as Error).message }));
        return;
      }
    }

    this.state.update((s) => ({ ...s, loading: true, error: null }));

    // Criar carteiras sequencialmente (poderia ser paralelo, mas sequencial é mais seguro)
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
            console.error('Erro ao criar carteira em lote:', err);
            const errorMessage = this.extractErrorMessage(err);
            this.state.update((s) => ({ ...s, error: errorMessage, loading: false }));
          },
        });
    };

    createNext();
  }

  /**
   * Remove múltiplas carteiras do estado local
   * @description Remove várias carteiras da lista local pelo ID
   * @param walletIds - Array com IDs das carteiras a serem removidas
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
        throw new Error('ID da carteira é obrigatório');
      }
    }

    this.state.update((s) => ({
      ...s,
      wallets: s.wallets.filter((w) => !walletIds.includes(w.id)),
    }));
  }

  /**
   * Atualiza dados de uma carteira no estado local
   * @description Atualiza carteira existente na lista local
   * @param updatedWallet - Dados atualizados da carteira
   * @throws {Error} Quando updatedWallet é inválido ou incompleto
   * @throws {Error} Quando carteira não foi encontrada no estado local
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
      return err.error?.message || 'Já existe uma carteira com este nome.';
    }

    // Erro do servidor
    if (err.status && err.status >= 500) {
      return 'Erro no servidor. Tente novamente mais tarde.';
    }

    // Erro genérico
    return err.error?.message || 'Ocorreu um erro inesperado.';
  }
}

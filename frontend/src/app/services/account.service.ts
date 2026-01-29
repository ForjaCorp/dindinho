import { Injectable, inject, signal, computed } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { CreateAccountDTO, AccountDTO, UpdateAccountDTO } from '@dindinho/shared';
import { ApiService } from './api.service';

/**
 * Interface do estado de contas
 * @description Define a estrutura do estado reativo do serviço de contas
 */
interface AccountState {
  /** Lista de contas do usuário */
  accounts: AccountDTO[];
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
 * constructor(private accountService: AccountService) {}
 *
 * // Acessar contas reativas
 * const accounts = this.accountService.accounts();
 *
 * // Carregar contas
 * this.accountService.loadAccounts();
 */

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private api = inject(ApiService);

  /**
   * Estado reativo privado das contas
   * @description Signal interno que mantém o estado completo das contas
   * @private
   */
  private state = signal<AccountState>({
    accounts: [],
    loading: false,
    error: null,
  });

  /**
   * Signal readonly para lista de contas
   * @description Retorna a lista atual de contas do usuário
   * @example
   * const accounts = this.accountService.accounts();
   */
  readonly accounts = computed(() => this.state().accounts);

  /**
   * Signal readonly para estado de carregamento
   * @description Indica se alguma operação está em andamento
   * @example
   * const isLoading = this.accountService.isLoading();
   */
  readonly isLoading = computed(() => this.state().loading);

  /**
   * Signal readonly para mensagem de erro
   * @description Retorna a mensagem de erro da última operação, se houver
   * @example
   * const error = this.accountService.error();
   */
  readonly error = computed(() => this.state().error);

  /**
   * Signal computado para saldo total
   * @description Soma dos saldos de todas as contas
   * @example
   * const total = this.accountService.totalBalance();
   */
  readonly totalBalance = computed(() =>
    this.accounts().reduce((acc: number, account: AccountDTO) => acc + (account.balance || 0), 0),
  );

  /**
   * Signal computado para contas por tipo
   * @description Retorna contas agrupadas por tipo (STANDARD, CREDIT)
   * @example
   * const byType = this.accountService.accountsByType();
   */
  readonly accountsByType = computed(() => {
    const accounts = this.accounts();
    return {
      standard: accounts.filter((a: AccountDTO) => a.type === 'STANDARD'),
      credit: accounts.filter((a: AccountDTO) => a.type === 'CREDIT'),
    };
  });

  /**
   * Busca uma conta pelo ID
   * @description Retorna uma conta específica pelo seu ID
   * @param accountId - ID da conta a ser buscada
   * @returns Conta encontrada ou undefined se não existir
   * @example
   * const account = this.accountService.getAccountById('account-123');
   */
  getAccountById(accountId: string): AccountDTO | undefined {
    if (!accountId) {
      return undefined;
    }
    return this.accounts().find((a: AccountDTO) => a.id === accountId);
  }

  /**
   * Busca contas por tipo
   * @description Retorna todas as contas de um tipo específico
   * @param type - Tipo das contas (STANDARD ou CREDIT)
   * @returns Array de contas do tipo especificado
   * @example
   * const creditCards = this.accountService.getAccountsByType('CREDIT');
   */
  getAccountsByType(type: AccountDTO['type']): AccountDTO[] {
    return this.accounts().filter((a: AccountDTO) => a.type === type);
  }

  /**
   * Ordena contas por critério especificado
   * @description Retorna cópia ordenada das contas sem modificar estado
   * @param sortBy - Critério de ordenação (name, balance, type)
   * @param direction - Direção da ordenação (asc ou desc)
   * @returns Array de contas ordenado
   * @example
   * const sorted = this.accountService.sortAccounts('balance', 'desc');
   */
  sortAccounts(
    sortBy: 'name' | 'balance' | 'type',
    direction: 'asc' | 'desc' = 'asc',
  ): AccountDTO[] {
    const accounts = [...this.accounts()];

    return accounts.sort((a: AccountDTO, b: AccountDTO) => {
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
   * const filtered = this.accountService.filterAccounts('nubank');
   */
  filterAccounts(searchTerm: string): AccountDTO[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return [...this.accounts()];
    }

    const term = searchTerm.toLowerCase().trim();
    return this.accounts().filter(
      (account: AccountDTO) =>
        account.name.toLowerCase().includes(term) || account.type.toLowerCase().includes(term),
    );
  }

  /**
   * Carrega as contas do servidor
   * @description Busca a lista de contas e atualiza o estado
   */
  loadAccounts(): void {
    this.updateState({ loading: true, error: null });

    this.api
      .getAccounts()
      .pipe(
        finalize(() => this.updateState({ loading: false })),
        tap({
          next: (accounts: AccountDTO[]) => this.updateState({ accounts }),
          error: (err) =>
            this.updateState({
              accounts: [],
              error: this.mapHttpError(err, {
                defaultMessage: 'Erro ao carregar contas',
                validationFallback: 'Dados inválidos',
              }),
            }),
        }),
      )
      .subscribe({
        error: () => undefined,
      });
  }

  /**
   * Cria uma nova conta
   * @description Envia os dados para criar uma nova conta e atualiza a lista
   * @param payload Dados da nova conta
   * @returns Observable com a conta criada
   */
  createAccount(payload: CreateAccountDTO): Observable<AccountDTO> {
    try {
      this.validateCreateAccountData(payload);
    } catch (error) {
      this.updateState({ loading: false, error: error instanceof Error ? error.message : 'Erro' });
      return throwError(() => error);
    }

    this.updateState({ loading: true, error: null });

    return this.api.createAccount(payload).pipe(
      finalize(() => this.updateState({ loading: false })),
      tap({
        next: (newAccount: AccountDTO) => {
          const currentAccounts = this.state().accounts;
          this.updateState({ accounts: [...currentAccounts, newAccount] });
        },
        error: (err: unknown) =>
          this.updateState({
            error: this.mapHttpError(err, {
              defaultMessage: 'Erro ao criar conta',
              validationFallback: 'Dados inválidos',
            }),
          }),
      }),
    );
  }

  updateAccount(accountId: string, payload: UpdateAccountDTO): Observable<AccountDTO> {
    if (!accountId || accountId.trim() === '') {
      const err = new Error('ID da conta é obrigatório');
      this.updateState({ loading: false, error: err.message });
      return throwError(() => err);
    }

    this.updateState({ loading: true, error: null });

    return this.api.updateAccount(accountId, payload).pipe(
      finalize(() => this.updateState({ loading: false })),
      tap({
        next: (updated: AccountDTO) => {
          this.updateState({
            accounts: this.state().accounts.map((a: AccountDTO) =>
              a.id === updated.id ? updated : a,
            ),
          });
        },
        error: (err: unknown) =>
          this.updateState({
            error: this.mapHttpError(err, {
              defaultMessage: 'Erro ao atualizar conta',
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
  private updateState(partial: Partial<AccountState>): void {
    this.state.update((current: AccountState) => ({ ...current, ...partial }));
  }

  /**
   * Limpa o estado de erro
   * @description Remove mensagem de erro do estado
   * @example
   * this.accountService.clearError();
   */
  clearError() {
    this.state.update((s: AccountState) => ({ ...s, error: null }));
  }

  /**
   * Remove uma conta do estado local
   * @description Remove conta da lista local (não deleta no backend)
   * @param accountId - ID da conta a ser removida
   * @throws {Error} Quando accountId é inválido ou nulo
   * @example
   * this.accountService.removeAccountFromState('account-123');
   */
  removeAccountFromState(accountId: string) {
    if (!accountId || accountId.trim() === '') {
      throw new Error('ID da conta é obrigatório');
    }

    this.state.update((s: AccountState) => ({
      ...s,
      accounts: s.accounts.filter((a: AccountDTO) => a.id !== accountId),
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
  private validateCreateAccountData(data: CreateAccountDTO): boolean {
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
    const existingAccount = this.accounts().find(
      (a: AccountDTO) => a.name.toLowerCase() === data.name.toLowerCase(),
    );

    if (existingAccount) {
      throw new Error('Já existe uma conta com este nome');
    }

    return true;
  }

  /**
   * Cria múltiplas contas em lote
   * @description Envia múltiplas contas para criação em lote
   * @param accountsData - Array com dados das contas a serem criadas
   * @throws {Error} Quando algum dado é inválido
   * @example
   * this.accountService.createMultipleAccounts([
   *   { name: 'Conta 1', color: '#FF0000', icon: 'pi-wallet', type: 'STANDARD' },
   *   { name: 'Conta 2', color: '#00FF00', icon: 'pi-credit-card', type: 'CREDIT' }
   * ]);
   */
  createMultipleAccounts(accountsData: CreateAccountDTO[]) {
    if (!Array.isArray(accountsData) || accountsData.length === 0) {
      this.state.update((s: AccountState) => ({ ...s, error: 'Array de contas é obrigatório' }));
      return;
    }

    // Validar todas as contas antes de enviar
    for (const data of accountsData) {
      try {
        this.validateCreateAccountData(data);
      } catch (error) {
        this.state.update((s: AccountState) => ({ ...s, error: (error as Error).message }));
        return;
      }
    }

    this.state.update((s: AccountState) => ({ ...s, loading: true, error: null }));

    // Criar contas sequencialmente (poderia ser paralelo, mas sequencial é mais seguro)
    const createdAccounts: AccountDTO[] = [];
    let currentIndex = 0;

    const createNext = () => {
      if (currentIndex >= accountsData.length) {
        // Todas criadas com sucesso
        this.state.update((s: AccountState) => ({
          ...s,
          accounts: [...s.accounts, ...createdAccounts],
          loading: false,
        }));
        return;
      }

      this.api
        .createAccount(accountsData[currentIndex])
        .pipe(
          finalize(() => {
            if (currentIndex >= accountsData.length - 1) {
              this.state.update((s: AccountState) => ({ ...s, loading: false }));
            }
          }),
        )
        .subscribe({
          next: (newAccount: AccountDTO) => {
            createdAccounts.push(newAccount);
            currentIndex++;
            createNext();
          },
          error: (err: unknown) => {
            const errorMessage = this.extractErrorMessage(err);
            this.state.update((s: AccountState) => ({ ...s, error: errorMessage, loading: false }));
          },
        });
    };

    createNext();
  }

  /**
   * Remove múltiplas contas do estado local
   * @description Remove várias contas da lista local pelo ID
   * @param accountIds - Array com IDs das contas a serem removidas
   * @throws {Error} Quando array é inválido ou vazio
   * @example
   * this.accountService.removeMultipleAccountsFromState(['account-1', 'account-2']);
   */
  removeMultipleAccountsFromState(accountIds: string[]) {
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      throw new Error('Array de IDs é obrigatório');
    }

    // Validar todos os IDs
    for (const id of accountIds) {
      if (!id || id.trim() === '') {
        throw new Error('ID da conta é obrigatório');
      }
    }

    this.state.update((s: AccountState) => ({
      ...s,
      accounts: s.accounts.filter((a: AccountDTO) => !accountIds.includes(a.id)),
    }));
  }

  /**
   * Atualiza dados de uma conta no estado local
   * @description Atualiza conta existente na lista local
   * @param updatedAccount - Dados atualizados da conta
   * @throws {Error} Quando updatedAccount é inválido ou incompleto
   * @throws {Error} Quando conta não foi encontrada no estado local
   * @example
   * this.accountService.updateAccountInState(updatedAccount);
   */
  updateAccountInState(updatedAccount: AccountDTO) {
    this.state.update((s: AccountState) => ({
      ...s,
      accounts: s.accounts.map((a: AccountDTO) =>
        a.id === updatedAccount.id ? updatedAccount : a,
      ),
    }));
  }

  /**
   * Extrai mensagem de erro baseada no tipo de erro
   * @param err - Erro retornado pela API
   * @returns Mensagem de erro tratada
   * @private
   * @throws {Error} Quando o erro não tem formato esperado
   */
  private extractErrorMessage(err: unknown): string {
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
    // Erro de rede
    if (status === 0) {
      return 'Erro de conexão. Verifique sua internet.';
    }

    // Erro de autenticação
    if (status === 401) {
      return 'Sessão expirada. Faça login novamente.';
    }

    // Erro de validação
    if (status === 400) {
      return message ?? 'Dados inválidos. Verifique as informações.';
    }

    // Nome duplicado
    if (status === 409) {
      return message ?? 'Já existe uma conta com este nome.';
    }

    // Erro do servidor
    if (typeof status === 'number' && status >= 500) {
      return 'Erro no servidor. Tente novamente mais tarde.';
    }

    const fallbackMessage =
      typeof errObj?.['message'] === 'string' ? (errObj['message'] as string) : undefined;
    return message ?? fallbackMessage ?? 'Ocorreu um erro inesperado.';
  }
}

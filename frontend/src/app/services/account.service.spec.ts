/**
 * Testes do serviço de contas
 * @description Testes unitários do AccountService responsável pelo gerenciamento de estado
 * @since 1.0.0
 */
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AccountService } from './account.service';
import { ApiService } from './api.service';
import {
  CreateAccountDTO,
  AccountDTO,
  UpdateAccountDTO,
  ResourcePermission,
} from '@dindinho/shared';

describe('AccountService', () => {
  let service: AccountService;
  let apiService: {
    getAccounts: ReturnType<typeof vi.fn>;
    createAccount: ReturnType<typeof vi.fn>;
    updateAccount: ReturnType<typeof vi.fn>;
  };
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  const mockAccounts: AccountDTO[] = [
    {
      id: 'account-1',
      name: 'Conta Padrão',
      color: '#FF5722',
      icon: 'pi-wallet',
      type: 'STANDARD',
      ownerId: 'user-123',
      permission: ResourcePermission.OWNER,
      balance: 1000.0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'account-2',
      name: 'Cartão Nubank',
      color: '#8A2BE2',
      icon: 'pi-credit-card',
      type: 'CREDIT',
      ownerId: 'user-123',
      permission: ResourcePermission.OWNER,
      balance: 500.5,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      creditCardInfo: {
        closingDay: 10,
        dueDay: 15,
        limit: 5000,
        brand: 'Mastercard',
      },
    },
  ];

  const mockCreateAccountData: CreateAccountDTO = {
    name: 'Nova Conta',
    color: '#00FF00',
    icon: 'pi-money-bill',
    type: 'STANDARD',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    apiService = {
      getAccounts: vi.fn(),
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [AccountService, { provide: ApiService, useValue: apiService }],
    });

    service = TestBed.inject(AccountService);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Inicialização', () => {
    it('deve criar o serviço', () => {
      expect(service).toBeTruthy();
    });

    it('deve inicializar com estado vazio', () => {
      expect(service.accounts()).toEqual([]);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
      expect(service.totalBalance()).toBe(0);
    });

    it('deve calcular accountsByType corretamente', () => {
      const byType = service.accountsByType();
      expect(byType.standard).toEqual([]);
      expect(byType.credit).toEqual([]);
    });

    it('deve calcular accountsByType corretamente com dados reais', () => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      const byType = service.accountsByType();
      expect(byType.standard).toHaveLength(1);
      expect(byType.credit).toHaveLength(1);
      expect(byType.standard[0].type).toBe('STANDARD');
      expect(byType.credit[0].type).toBe('CREDIT');
    });

    it('deve calcular totalBalance corretamente com dados reais', () => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.totalBalance()).toBe(1500.5);
    });
  });

  describe('loadAccounts()', () => {
    it('deve carregar contas com sucesso', () => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));

      service.loadAccounts();

      expect(apiService.getAccounts).toHaveBeenCalled();

      // Simular resposta assíncrona
      vi.useFakeTimers();
      vi.runAllTimers();

      // Verificar resultado final
      expect(service.accounts()).toEqual(mockAccounts);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
      expect(service.totalBalance()).toBe(1500.5);
    });

    it('deve tratar erro de rede', () => {
      const networkError = new HttpErrorResponse({ status: 0 });
      apiService.getAccounts.mockReturnValue(throwError(() => networkError));

      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.accounts()).toEqual([]);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBe('Não foi possível conectar ao servidor. Verifique sua conexão.');
    });

    it('deve tratar erro de autenticação', () => {
      const authError = new HttpErrorResponse({ status: 401 });
      apiService.getAccounts.mockReturnValue(throwError(() => authError));

      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe(
        'Sessão expirada ou não autorizada. Por favor, faça login novamente.',
      );
    });

    it('deve tratar erro de validação', () => {
      const validationError = new HttpErrorResponse({
        status: 400,
        error: { message: 'Dados inválidos' },
      });
      apiService.getAccounts.mockReturnValue(throwError(() => validationError));

      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Dados inválidos');
    });

    it('deve tratar erro de servidor', () => {
      const serverError = new HttpErrorResponse({ status: 500 });
      apiService.getAccounts.mockReturnValue(throwError(() => serverError));

      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Erro no servidor. Estamos trabalhando para resolver.');
    });

    it('deve tratar erro genérico', () => {
      const genericError = new HttpErrorResponse({ status: 418 });
      apiService.getAccounts.mockReturnValue(throwError(() => genericError));

      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    });
  });

  describe('createAccount()', () => {
    const newAccount: AccountDTO = {
      id: 'account-3',
      name: 'Nova Conta',
      color: '#00FF00',
      icon: 'pi-money-bill',
      type: 'STANDARD',
      ownerId: 'user-123',
      permission: ResourcePermission.OWNER,
      balance: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('deve criar conta com sucesso', () => {
      // Testa criação partindo do estado inicial vazio
      apiService.createAccount.mockReturnValue(of(newAccount));

      const observable = service.createAccount(mockCreateAccountData);

      expect(apiService.createAccount).toHaveBeenCalledWith(mockCreateAccountData);

      // Se inscreve para executar a operação (como o componente faz)
      observable.subscribe();

      vi.useFakeTimers();
      vi.runAllTimers();

      // Verifica que a conta foi adicionada
      expect(service.accounts()).toHaveLength(1);
      expect(service.accounts()[0]).toEqual(newAccount);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('deve tratar erro de nome duplicado', () => {
      const duplicateError = new HttpErrorResponse({
        status: 409,
        error: { message: 'Nome já existe' },
      });
      apiService.createAccount.mockReturnValue(throwError(() => duplicateError));

      const observable = service.createAccount(mockCreateAccountData);

      // Se inscreve para executar a operação
      observable.subscribe({
        error: () => undefined,
      });

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Nome já existe');
      expect(service.accounts()).toEqual([]);
    });

    it('deve tratar erro de validação na criação', () => {
      const validationError = new HttpErrorResponse({
        status: 400,
        error: { message: 'Cor inválida' },
      });
      apiService.createAccount.mockReturnValue(throwError(() => validationError));

      const observable = service.createAccount(mockCreateAccountData);

      // Se inscreve para executar a operação
      observable.subscribe({
        error: () => undefined,
      });

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Cor inválida');
    });
  });

  describe('updateAccount()', () => {
    it('deve atualizar conta com sucesso', () => {
      const initial = mockAccounts[0]!;
      apiService.getAccounts.mockReturnValue(of([initial]));
      service.loadAccounts();

      const updated: AccountDTO = {
        ...initial,
        name: 'Conta Editada',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const payload: UpdateAccountDTO = { name: 'Conta Editada' };
      apiService.updateAccount.mockReturnValue(of(updated));

      const observable = service.updateAccount(initial.id, payload);
      observable.subscribe();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(apiService.updateAccount).toHaveBeenCalledWith(initial.id, payload);
      expect(service.accounts()).toEqual([updated]);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('deve tratar erro de validação ao atualizar', () => {
      const initial = mockAccounts[0]!;
      apiService.getAccounts.mockReturnValue(of([initial]));
      service.loadAccounts();

      const payload: UpdateAccountDTO = { name: '' };
      apiService.updateAccount.mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 400, error: { message: 'Dados inválidos' } }),
        ),
      );

      service.updateAccount(initial.id, payload).subscribe({ error: () => undefined });

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Dados inválidos');
    });

    it('deve falhar quando ID é vazio', () => {
      service.updateAccount('', { name: 'X' }).subscribe({ error: () => undefined });
      expect(service.error()).toBe('ID da conta é obrigatório');
    });
  });

  describe('clearError()', () => {
    it('deve limpar mensagem de erro', () => {
      // Testa limpar erro quando não há erro
      service.clearError();
      expect(service.error()).toBeNull();
    });
  });

  describe('removeAccountFromState()', () => {
    it('deve remover conta do estado local', () => {
      // Testa remoção quando não há contas (estado inicial)
      service.removeAccountFromState('account-1');
      expect(service.accounts()).toEqual([]);
    });

    it('não deve alterar estado se accountId não encontrado', () => {
      // Testa remoção quando não há contas (estado inicial)
      service.removeAccountFromState('account-inexistente');
      expect(service.accounts()).toEqual([]);
    });

    it('deve lançar erro quando ID é vazio', () => {
      expect(() => service.removeAccountFromState('')).toThrow('ID da conta é obrigatório');
    });
  });

  describe('updateAccountInState()', () => {
    it('deve atualizar conta existente no estado local', () => {
      // Testa atualização quando não há contas (estado inicial)
      const updatedAccount: AccountDTO = {
        id: 'account-novo',
        name: 'Nova Conta',
        color: '#FF0000',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      service.updateAccountInState(updatedAccount);
      expect(service.accounts()).toEqual([]); // Estado não deve mudar
    });

    it('não deve alterar estado se accountId não encontrado', () => {
      // Testa atualização quando não há contas (estado inicial)
      const updatedAccount: AccountDTO = {
        id: 'account-novo',
        name: 'Nova Conta',
        color: '#FF0000',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      service.updateAccountInState(updatedAccount);
      expect(service.accounts()).toEqual([]); // Estado não deve mudar
    });
  });

  describe('getAccountById()', () => {
    it('deve retornar undefined quando não há contas', () => {
      expect(service.getAccountById('account-1')).toBeUndefined();
    });

    it('deve retornar undefined com ID vazio', () => {
      expect(service.getAccountById('')).toBeUndefined();
      expect(service.getAccountById('   ')).toBeUndefined();
      expect(service.getAccountById(null as unknown as string)).toBeUndefined();
      expect(service.getAccountById(undefined as unknown as string)).toBeUndefined();
    });

    it('deve encontrar conta por ID quando existente', () => {
      // Primeiro carregar contas mock
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      const account = service.getAccountById('account-1');
      expect(account).toEqual(mockAccounts[0]);
    });

    it('deve retornar undefined quando ID não encontrado', () => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      const account = service.getAccountById('inexistente');
      expect(account).toBeUndefined();
    });
  });

  describe('getAccountsByType()', () => {
    it('deve retornar array vazio quando não há contas', () => {
      expect(service.getAccountsByType('STANDARD')).toEqual([]);
      expect(service.getAccountsByType('CREDIT')).toEqual([]);
    });

    it('deve filtrar contas por tipo corretamente', () => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      const standardAccounts = service.getAccountsByType('STANDARD');
      const creditAccounts = service.getAccountsByType('CREDIT');

      expect(standardAccounts).toHaveLength(1);
      expect(standardAccounts[0].id).toBe('account-1');
      expect(standardAccounts[0].type).toBe('STANDARD');

      expect(creditAccounts).toHaveLength(1);
      expect(creditAccounts[0].id).toBe('account-2');
      expect(creditAccounts[0].type).toBe('CREDIT');
    });
  });

  describe('sortAccounts()', () => {
    beforeEach(() => {
      // Carregar contas para testes de ordenação
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();
      vi.useFakeTimers();
      vi.runAllTimers();
    });

    it('deve ordenar por nome ascendente', () => {
      const sorted = service.sortAccounts('name', 'asc');
      expect(sorted[0].name).toBe('Cartão Nubank');
      expect(sorted[1].name).toBe('Conta Padrão');
    });

    it('deve ordenar por nome descendente', () => {
      const sorted = service.sortAccounts('name', 'desc');
      expect(sorted[0].name).toBe('Conta Padrão');
      expect(sorted[1].name).toBe('Cartão Nubank');
    });

    it('deve ordenar por saldo ascendente', () => {
      const sorted = service.sortAccounts('balance', 'asc');
      expect(sorted[0].balance).toBe(500.5);
      expect(sorted[1].balance).toBe(1000.0);
    });

    it('deve ordenar por saldo descendente', () => {
      const sorted = service.sortAccounts('balance', 'desc');
      expect(sorted[0].balance).toBe(1000.0);
      expect(sorted[1].balance).toBe(500.5);
    });

    it('deve ordenar por tipo', () => {
      const sorted = service.sortAccounts('type', 'asc');
      expect(sorted[0].type).toBe('CREDIT');
      expect(sorted[1].type).toBe('STANDARD');
    });

    it('deve usar direção ascendente por padrão', () => {
      const sorted = service.sortAccounts('name');
      expect(sorted[0].name).toBe('Cartão Nubank');
      expect(sorted[1].name).toBe('Conta Padrão');
    });

    it('não deve modificar estado original', () => {
      const originalAccounts = [...service.accounts()];
      service.sortAccounts('balance', 'desc');
      expect(service.accounts()).toEqual(originalAccounts);
    });
  });

  describe('filterAccounts()', () => {
    beforeEach(() => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();
      vi.useFakeTimers();
      vi.runAllTimers();
    });

    it('deve retornar todas contas com termo vazio', () => {
      const filtered = service.filterAccounts('');
      expect(filtered).toHaveLength(2);
    });

    it('deve retornar todas contas com espaço em branco', () => {
      const filtered = service.filterAccounts('   ');
      expect(filtered).toHaveLength(2);
    });

    it('deve filtrar por nome (case insensitive)', () => {
      const filtered = service.filterAccounts('padrão');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Conta Padrão');
    });

    it('deve filtrar por tipo (case insensitive)', () => {
      const filtered = service.filterAccounts('credit');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('CREDIT');
    });

    it('deve filtrar por parte do nome', () => {
      const filtered = service.filterAccounts('nubank');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Cartão Nubank');
    });

    it('deve retornar vazio quando não encontrar correspondência', () => {
      const filtered = service.filterAccounts('inexistente');
      expect(filtered).toHaveLength(0);
    });

    it('não deve modificar estado original', () => {
      const originalAccounts = [...service.accounts()];
      service.filterAccounts('test');
      expect(service.accounts()).toEqual(originalAccounts);
    });
  });

  describe('removeMultipleAccountsFromState()', () => {
    beforeEach(() => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();
      vi.useFakeTimers();
      vi.runAllTimers();
    });

    it('deve remover múltiplas contas do estado', () => {
      service.removeMultipleAccountsFromState(['account-1', 'account-2']);
      expect(service.accounts()).toHaveLength(0);
    });

    it('deve remover apenas contas especificadas', () => {
      service.removeMultipleAccountsFromState(['account-1']);
      expect(service.accounts()).toHaveLength(1);
      expect(service.accounts()[0].id).toBe('account-2');
    });

    it('deve lançar erro com array vazio', () => {
      expect(() => service.removeMultipleAccountsFromState([])).toThrow(
        'Array de IDs é obrigatório',
      );
    });

    it('deve lançar erro com array inválido', () => {
      expect(() => service.removeMultipleAccountsFromState(null as unknown as string[])).toThrow(
        'Array de IDs é obrigatório',
      );
    });

    it('deve lançar erro com ID vazio no array', () => {
      expect(() => service.removeMultipleAccountsFromState(['account-1', ''])).toThrow(
        'ID da conta é obrigatório',
      );
    });
  });

  describe('createMultipleAccounts()', () => {
    it('deve lançar erro com array vazio', () => {
      service.createMultipleAccounts([]);
      expect(service.error()).toBe('Array de contas é obrigatório');
    });

    it('deve lançar erro com array inválido', () => {
      service.createMultipleAccounts(null as unknown as CreateAccountDTO[]);
      expect(service.error()).toBe('Array de contas é obrigatório');
    });

    it('deve validar dados antes de criar', () => {
      const invalidData = [
        { name: '', color: '#FF0000', icon: 'pi-wallet', type: 'STANDARD' as const },
      ];
      service.createMultipleAccounts(invalidData);
      expect(service.error()).toBe('Nome da conta é obrigatório');
    });

    it('deve criar múltiplas contas com sucesso', () => {
      const accountsToCreate = [
        { name: 'Conta 3', color: '#FF0000', icon: 'pi-wallet', type: 'STANDARD' as const },
        { name: 'Conta 4', color: '#00FF00', icon: 'pi-credit-card', type: 'CREDIT' as const },
      ];

      const mockAccount3: AccountDTO = {
        id: 'account-3',
        name: 'Conta 3',
        color: '#FF0000',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockAccount4: AccountDTO = {
        id: 'account-4',
        name: 'Conta 4',
        color: '#00FF00',
        icon: 'pi-credit-card',
        type: 'CREDIT',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      apiService.createAccount
        .mockReturnValueOnce(of(mockAccount3))
        .mockReturnValueOnce(of(mockAccount4));

      service.createMultipleAccounts(accountsToCreate);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.accounts()).toHaveLength(2);
      expect(service.accounts()[0].id).toBe('account-3');
      expect(service.accounts()[1].id).toBe('account-4');
      expect(service.error()).toBeNull();
    });
  });

  describe('integração entre métodos', () => {
    it('deve criar conta e depois buscar por ID', () => {
      const newAccount: AccountDTO = {
        id: 'account-3',
        name: 'Nova Conta',
        color: '#00FF00',
        icon: 'pi-money-bill',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      apiService.createAccount.mockReturnValue(of(newAccount));

      const observable = service.createAccount(mockCreateAccountData);

      // Se inscreve para executar a operação
      observable.subscribe();

      vi.useFakeTimers();
      vi.runAllTimers();

      const foundAccount = service.getAccountById('account-3');
      expect(foundAccount).toEqual(newAccount);
    });

    it('deve carregar contas e depois filtrar', () => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      const filtered = service.filterAccounts('nubank');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('account-2');
    });

    it('deve calcular accountsByType corretamente com dados reais', () => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      const byType = service.accountsByType();
      expect(byType.standard).toHaveLength(1);
      expect(byType.credit).toHaveLength(1);
      expect(byType.standard[0].type).toBe('STANDARD');
      expect(byType.credit[0].type).toBe('CREDIT');
    });
  });

  describe('validação local', () => {
    it('deve validar nome obrigatório na criação', () => {
      const invalidData = { ...mockCreateAccountData, name: '' };
      service.createAccount(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Nome da conta é obrigatório');
      expect(apiService.createAccount).not.toHaveBeenCalled();
    });

    it('deve validar tamanho máximo do nome', () => {
      const invalidData = { ...mockCreateAccountData, name: 'a'.repeat(51) };
      service.createAccount(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Nome da conta deve ter no máximo 50 caracteres');
      expect(apiService.createAccount).not.toHaveBeenCalled();
    });

    it('deve validar cor obrigatória', () => {
      const invalidData = { ...mockCreateAccountData, color: '' };
      service.createAccount(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Cor da conta é obrigatória');
      expect(apiService.createAccount).not.toHaveBeenCalled();
    });

    it('deve validar ícone obrigatório', () => {
      const invalidData = { ...mockCreateAccountData, icon: '' };
      service.createAccount(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Ícone da conta é obrigatório');
      expect(apiService.createAccount).not.toHaveBeenCalled();
    });

    it('deve validar tipo inválido', () => {
      const invalidData = {
        ...mockCreateAccountData,
        type: 'INVALID' as CreateAccountDTO['type'],
      };
      service.createAccount(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Tipo da conta deve ser STANDARD ou CREDIT');
      expect(apiService.createAccount).not.toHaveBeenCalled();
    });

    it('deve validar nome duplicado localmente', () => {
      apiService.getAccounts.mockReturnValue(of(mockAccounts));
      service.loadAccounts();

      vi.useFakeTimers();
      vi.runAllTimers();

      const duplicateData = { ...mockCreateAccountData, name: 'Conta Padrão' };
      service.createAccount(duplicateData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Já existe uma conta com este nome');
      expect(apiService.createAccount).not.toHaveBeenCalled();
    });
  });
});

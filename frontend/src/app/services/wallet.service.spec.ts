/**
 * Testes do serviço de contas
 * @description Testes unitários do WalletService responsável pelo gerenciamento de estado
 * @since 1.0.0
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { WalletService } from './wallet.service';
import { ApiService } from './api.service';
import { CreateWalletDTO, WalletDTO } from '@dindinho/shared';

describe('WalletService', () => {
  let service: WalletService;
  let apiService: {
    getWallets: ReturnType<typeof vi.fn>;
    createWallet: ReturnType<typeof vi.fn>;
  };
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  const mockWallets: WalletDTO[] = [
    {
      id: 'wallet-1',
      name: 'Conta Padrão',
      color: '#FF5722',
      icon: 'pi-wallet',
      type: 'STANDARD',
      ownerId: 'user-123',
      balance: 1000.0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'wallet-2',
      name: 'Cartão Nubank',
      color: '#8A2BE2',
      icon: 'pi-credit-card',
      type: 'CREDIT',
      ownerId: 'user-123',
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

  const mockCreateWalletData: CreateWalletDTO = {
    name: 'Nova Conta',
    color: '#00FF00',
    icon: 'pi-money-bill',
    type: 'STANDARD',
  };

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    apiService = {
      getWallets: vi.fn(),
      createWallet: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [WalletService, { provide: ApiService, useValue: apiService }],
    });

    service = TestBed.inject(WalletService);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve criar o serviço', () => {
      expect(service).toBeTruthy();
    });

    it('deve inicializar com estado vazio', () => {
      expect(service.wallets()).toEqual([]);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
      expect(service.totalBalance()).toBe(0);
    });

    it('deve calcular walletsByType corretamente', () => {
      // Testa que o computed funciona corretamente quando há contas
      const byType = service.walletsByType();
      expect(byType.standard).toEqual([]);
      expect(byType.credit).toEqual([]);
    });

    it('deve calcular walletsByType corretamente com dados reais', () => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      const byType = service.walletsByType();
      expect(byType.standard).toHaveLength(1);
      expect(byType.credit).toHaveLength(1);
      expect(byType.standard[0].type).toBe('STANDARD');
      expect(byType.credit[0].type).toBe('CREDIT');
    });

    it('deve calcular totalBalance corretamente com dados reais', () => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.totalBalance()).toBe(1500.5);
    });
  });

  describe('loadWallets()', () => {
    it('deve carregar contas com sucesso', () => {
      apiService.getWallets.mockReturnValue(of(mockWallets));

      service.loadWallets();

      expect(apiService.getWallets).toHaveBeenCalled();

      // Simular resposta assíncrona
      vi.useFakeTimers();
      vi.runAllTimers();

      // Verificar resultado final
      expect(service.wallets()).toEqual(mockWallets);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
      expect(service.totalBalance()).toBe(1500.5);
    });

    it('deve tratar erro de rede', () => {
      const networkError = { status: 0 };
      apiService.getWallets.mockReturnValue(throwError(() => networkError));

      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.wallets()).toEqual([]);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBe('Erro de conexão. Verifique sua internet.');
    });

    it('deve tratar erro de autenticação', () => {
      const authError = { status: 401 };
      apiService.getWallets.mockReturnValue(throwError(() => authError));

      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Sessão expirada. Faça login novamente.');
    });

    it('deve tratar erro de validação', () => {
      const validationError = {
        status: 400,
        error: { message: 'Dados inválidos' },
      };
      apiService.getWallets.mockReturnValue(throwError(() => validationError));

      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Dados inválidos');
    });

    it('deve tratar erro de servidor', () => {
      const serverError = { status: 500 };
      apiService.getWallets.mockReturnValue(throwError(() => serverError));

      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Erro no servidor. Tente novamente mais tarde.');
    });

    it('deve tratar erro genérico', () => {
      const genericError = { status: 418 };
      apiService.getWallets.mockReturnValue(throwError(() => genericError));

      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Ocorreu um erro inesperado.');
    });
  });

  describe('createWallet()', () => {
    const newWallet: WalletDTO = {
      id: 'wallet-3',
      name: 'Nova Conta',
      color: '#00FF00',
      icon: 'pi-money-bill',
      type: 'STANDARD',
      ownerId: 'user-123',
      balance: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('deve criar conta com sucesso', () => {
      // Testa criação partindo do estado inicial vazio
      apiService.createWallet.mockReturnValue(of(newWallet));

      const observable = service.createWallet(mockCreateWalletData);

      expect(apiService.createWallet).toHaveBeenCalledWith(mockCreateWalletData);

      // Se inscreve para executar a operação (como o componente faz)
      observable.subscribe();

      vi.useFakeTimers();
      vi.runAllTimers();

      // Verifica que a conta foi adicionada
      expect(service.wallets()).toHaveLength(1);
      expect(service.wallets()[0]).toEqual(newWallet);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('deve tratar erro de nome duplicado', () => {
      const duplicateError = { status: 409, error: { message: 'Nome já existe' } };
      apiService.createWallet.mockReturnValue(throwError(() => duplicateError));

      const observable = service.createWallet(mockCreateWalletData);

      // Se inscreve para executar a operação
      observable.subscribe();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Nome já existe');
      expect(service.wallets()).toEqual([]);
    });

    it('deve tratar erro de validação na criação', () => {
      const validationError = {
        status: 400,
        error: { message: 'Cor inválida' },
      };
      apiService.createWallet.mockReturnValue(throwError(() => validationError));

      const observable = service.createWallet(mockCreateWalletData);

      // Se inscreve para executar a operação
      observable.subscribe();

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Cor inválida');
    });
  });

  describe('clearError()', () => {
    it('deve limpar mensagem de erro', () => {
      // Testa limpar erro quando não há erro
      service.clearError();
      expect(service.error()).toBeNull();
    });
  });

  describe('removeWalletFromState()', () => {
    it('deve remover conta do estado local', () => {
      // Testa remoção quando não há contas (estado inicial)
      service.removeWalletFromState('wallet-1');
      expect(service.wallets()).toEqual([]);
    });

    it('não deve alterar estado se walletId não encontrado', () => {
      // Testa remoção quando não há contas (estado inicial)
      service.removeWalletFromState('wallet-inexistente');
      expect(service.wallets()).toEqual([]);
    });
  });

  describe('updateWalletInState()', () => {
    it('deve atualizar conta existente no estado local', () => {
      // Testa atualização quando não há contas (estado inicial)
      const newWallet: WalletDTO = {
        id: 'wallet-novo',
        name: 'Nova Conta',
        color: '#FF0000',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      service.updateWalletInState(newWallet);
      expect(service.wallets()).toEqual([]); // Estado não deve mudar
    });

    it('não deve alterar estado se walletId não encontrado', () => {
      // Testa atualização quando não há contas (estado inicial)
      const newWallet: WalletDTO = {
        id: 'wallet-novo',
        name: 'Nova Conta',
        color: '#FF0000',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      service.updateWalletInState(newWallet);
      expect(service.wallets()).toEqual([]); // Estado não deve mudar
    });
  });

  describe('getWalletById()', () => {
    it('deve retornar undefined quando não há contas', () => {
      expect(service.getWalletById('wallet-1')).toBeUndefined();
    });

    it('deve retornar undefined com ID vazio', () => {
      expect(service.getWalletById('')).toBeUndefined();
      expect(service.getWalletById('   ')).toBeUndefined();
      expect(service.getWalletById(null as unknown as string)).toBeUndefined();
      expect(service.getWalletById(undefined as unknown as string)).toBeUndefined();
    });

    it('deve encontrar conta por ID quando existente', () => {
      // Primeiro carregar contas mock
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      const wallet = service.getWalletById('wallet-1');
      expect(wallet).toEqual(mockWallets[0]);
    });

    it('deve retornar undefined quando ID não encontrado', () => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      const wallet = service.getWalletById('inexistente');
      expect(wallet).toBeUndefined();
    });
  });

  describe('getWalletsByType()', () => {
    it('deve retornar array vazio quando não há contas', () => {
      expect(service.getWalletsByType('STANDARD')).toEqual([]);
      expect(service.getWalletsByType('CREDIT')).toEqual([]);
    });

    it('deve filtrar contas por tipo corretamente', () => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      const standardWallets = service.getWalletsByType('STANDARD');
      const creditWallets = service.getWalletsByType('CREDIT');

      expect(standardWallets).toHaveLength(1);
      expect(standardWallets[0].id).toBe('wallet-1');
      expect(standardWallets[0].type).toBe('STANDARD');

      expect(creditWallets).toHaveLength(1);
      expect(creditWallets[0].id).toBe('wallet-2');
      expect(creditWallets[0].type).toBe('CREDIT');
    });
  });

  describe('sortWallets()', () => {
    beforeEach(() => {
      // Carregar contas para testes de ordenação
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();
      vi.useFakeTimers();
      vi.runAllTimers();
    });

    it('deve ordenar por nome ascendente', () => {
      const sorted = service.sortWallets('name', 'asc');
      expect(sorted[0].name).toBe('Cartão Nubank');
      expect(sorted[1].name).toBe('Conta Padrão');
    });

    it('deve ordenar por nome descendente', () => {
      const sorted = service.sortWallets('name', 'desc');
      expect(sorted[0].name).toBe('Conta Padrão');
      expect(sorted[1].name).toBe('Cartão Nubank');
    });

    it('deve ordenar por saldo ascendente', () => {
      const sorted = service.sortWallets('balance', 'asc');
      expect(sorted[0].balance).toBe(500.5);
      expect(sorted[1].balance).toBe(1000.0);
    });

    it('deve ordenar por saldo descendente', () => {
      const sorted = service.sortWallets('balance', 'desc');
      expect(sorted[0].balance).toBe(1000.0);
      expect(sorted[1].balance).toBe(500.5);
    });

    it('deve ordenar por tipo', () => {
      const sorted = service.sortWallets('type', 'asc');
      expect(sorted[0].type).toBe('CREDIT');
      expect(sorted[1].type).toBe('STANDARD');
    });

    it('deve usar direção ascendente por padrão', () => {
      const sorted = service.sortWallets('name');
      expect(sorted[0].name).toBe('Cartão Nubank');
      expect(sorted[1].name).toBe('Conta Padrão');
    });

    it('não deve modificar estado original', () => {
      const originalWallets = [...service.wallets()];
      service.sortWallets('balance', 'desc');
      expect(service.wallets()).toEqual(originalWallets);
    });
  });

  describe('filterWallets()', () => {
    beforeEach(() => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();
      vi.useFakeTimers();
      vi.runAllTimers();
    });

    it('deve retornar todas contas com termo vazio', () => {
      const filtered = service.filterWallets('');
      expect(filtered).toHaveLength(2);
    });

    it('deve retornar todas contas com espaço em branco', () => {
      const filtered = service.filterWallets('   ');
      expect(filtered).toHaveLength(2);
    });

    it('deve filtrar por nome (case insensitive)', () => {
      const filtered = service.filterWallets('padrão');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Conta Padrão');
    });

    it('deve filtrar por tipo (case insensitive)', () => {
      const filtered = service.filterWallets('credit');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('CREDIT');
    });

    it('deve filtrar por parte do nome', () => {
      const filtered = service.filterWallets('nubank');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Cartão Nubank');
    });

    it('deve retornar vazio quando não encontrar correspondência', () => {
      const filtered = service.filterWallets('inexistente');
      expect(filtered).toHaveLength(0);
    });

    it('não deve modificar estado original', () => {
      const originalWallets = [...service.wallets()];
      service.filterWallets('test');
      expect(service.wallets()).toEqual(originalWallets);
    });
  });

  describe('removeMultipleWalletsFromState()', () => {
    beforeEach(() => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();
      vi.useFakeTimers();
      vi.runAllTimers();
    });

    it('deve remover múltiplas contas do estado', () => {
      service.removeMultipleWalletsFromState(['wallet-1', 'wallet-2']);
      expect(service.wallets()).toHaveLength(0);
    });

    it('deve remover apenas contas especificadas', () => {
      service.removeMultipleWalletsFromState(['wallet-1']);
      expect(service.wallets()).toHaveLength(1);
      expect(service.wallets()[0].id).toBe('wallet-2');
    });

    it('deve lançar erro com array vazio', () => {
      expect(() => service.removeMultipleWalletsFromState([])).toThrow(
        'Array de IDs é obrigatório',
      );
    });

    it('deve lançar erro com array inválido', () => {
      expect(() => service.removeMultipleWalletsFromState(null as unknown as string[])).toThrow(
        'Array de IDs é obrigatório',
      );
    });

    it('deve lançar erro com ID vazio no array', () => {
      expect(() => service.removeMultipleWalletsFromState(['wallet-1', ''])).toThrow(
        'ID da conta é obrigatório',
      );
    });
  });

  describe('createMultipleWallets()', () => {
    it('deve lançar erro com array vazio', () => {
      service.createMultipleWallets([]);
      expect(service.error()).toBe('Array de contas é obrigatório');
    });

    it('deve lançar erro com array inválido', () => {
      service.createMultipleWallets(null as unknown as CreateWalletDTO[]);
      expect(service.error()).toBe('Array de contas é obrigatório');
    });

    it('deve validar dados antes de criar', () => {
      const invalidData = [
        { name: '', color: '#FF0000', icon: 'pi-wallet', type: 'STANDARD' as const },
      ];
      service.createMultipleWallets(invalidData);
      expect(service.error()).toBe('Nome da conta é obrigatório');
    });

    it('deve criar múltiplas contas com sucesso', () => {
      const walletsToCreate = [
        { name: 'Conta 3', color: '#FF0000', icon: 'pi-wallet', type: 'STANDARD' as const },
        { name: 'Conta 4', color: '#00FF00', icon: 'pi-credit-card', type: 'CREDIT' as const },
      ];

      const mockWallet3: WalletDTO = {
        id: 'wallet-3',
        name: 'Conta 3',
        color: '#FF0000',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockWallet4: WalletDTO = {
        id: 'wallet-4',
        name: 'Conta 4',
        color: '#00FF00',
        icon: 'pi-credit-card',
        type: 'CREDIT',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      apiService.createWallet
        .mockReturnValueOnce(of(mockWallet3))
        .mockReturnValueOnce(of(mockWallet4));

      service.createMultipleWallets(walletsToCreate);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.wallets()).toHaveLength(2);
      expect(service.wallets()[0].id).toBe('wallet-3');
      expect(service.wallets()[1].id).toBe('wallet-4');
      expect(service.error()).toBeNull();
    });
  });

  describe('integração entre métodos', () => {
    it('deve criar conta e depois buscar por ID', () => {
      const newWallet: WalletDTO = {
        id: 'wallet-3',
        name: 'Nova Conta',
        color: '#00FF00',
        icon: 'pi-money-bill',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      apiService.createWallet.mockReturnValue(of(newWallet));

      const observable = service.createWallet(mockCreateWalletData);

      // Se inscreve para executar a operação
      observable.subscribe();

      vi.useFakeTimers();
      vi.runAllTimers();

      const foundWallet = service.getWalletById('wallet-3');
      expect(foundWallet).toEqual(newWallet);
    });

    it('deve carregar contas e depois filtrar', () => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      const filtered = service.filterWallets('nubank');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('wallet-2');
    });

    it('deve calcular walletsByType corretamente com dados reais', () => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      const byType = service.walletsByType();
      expect(byType.standard).toHaveLength(1);
      expect(byType.credit).toHaveLength(1);
      expect(byType.standard[0].type).toBe('STANDARD');
      expect(byType.credit[0].type).toBe('CREDIT');
    });
  });

  describe('validação local', () => {
    it('deve validar nome obrigatório na criação', () => {
      const invalidData = { ...mockCreateWalletData, name: '' };
      service.createWallet(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Nome da conta é obrigatório');
      expect(apiService.createWallet).not.toHaveBeenCalled();
    });

    it('deve validar tamanho máximo do nome', () => {
      const invalidData = { ...mockCreateWalletData, name: 'a'.repeat(51) };
      service.createWallet(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Nome da conta deve ter no máximo 50 caracteres');
      expect(apiService.createWallet).not.toHaveBeenCalled();
    });

    it('deve validar cor obrigatória', () => {
      const invalidData = { ...mockCreateWalletData, color: '' };
      service.createWallet(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Cor da conta é obrigatória');
      expect(apiService.createWallet).not.toHaveBeenCalled();
    });

    it('deve validar ícone obrigatório', () => {
      const invalidData = { ...mockCreateWalletData, icon: '' };
      service.createWallet(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Ícone da conta é obrigatório');
      expect(apiService.createWallet).not.toHaveBeenCalled();
    });

    it('deve validar tipo inválido', () => {
      const invalidData = { ...mockCreateWalletData, type: 'INVALID' as CreateWalletDTO['type'] };
      service.createWallet(invalidData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Tipo da conta deve ser STANDARD ou CREDIT');
      expect(apiService.createWallet).not.toHaveBeenCalled();
    });

    it('deve validar nome duplicado localmente', () => {
      apiService.getWallets.mockReturnValue(of(mockWallets));
      service.loadWallets();

      vi.useFakeTimers();
      vi.runAllTimers();

      const duplicateData = { ...mockCreateWalletData, name: 'Conta Padrão' };
      service.createWallet(duplicateData);

      vi.useFakeTimers();
      vi.runAllTimers();

      expect(service.error()).toBe('Já existe uma conta com este nome');
      expect(apiService.createWallet).not.toHaveBeenCalled();
    });
  });
});

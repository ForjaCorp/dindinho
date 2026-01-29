/**
 * Testes do serviço de API
 * @description Testes unitários do ApiService responsável por comunicação com backend
 * @since 1.0.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpRequest, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService, AllowlistDeleteResponse, AllowlistItem } from './api.service';
import {
  HealthCheckDTO,
  LoginDTO,
  LoginResponseDTO,
  CategoryDTO,
  CreateCategoryDTO,
  CreateAccountDTO,
  AccountDTO,
  CreateTransactionDTO,
  TransactionDTO,
  UpdateTransactionDTO,
  DeleteTransactionResponseDTO,
} from '@dindinho/shared';

/**
 * Suite de testes do ApiService
 * @description Testa funcionalidades de comunicação com API backend
 */
describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const mockApiResponse: HealthCheckDTO = {
    status: 'ok',
    app: 'Dindinho API',
    timestamp: '2026-01-01T00:00:00.000Z',
  };

  const mockLoginData: LoginDTO = {
    email: 'test@example.com',
    password: 'password123',
  };

  const mockLoginResponse: LoginResponseDTO = {
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'VIEWER',
    },
    token: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockCreateAccountData: CreateAccountDTO = {
    name: 'Cartão Nubank',
    color: '#8A2BE2',
    icon: 'pi-credit-card',
    type: 'CREDIT',
    closingDay: 10,
    dueDay: 15,
    limit: 5000,
    brand: 'Mastercard',
  };

  const mockAccount: AccountDTO = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Cartão Nubank',
    color: '#8A2BE2',
    icon: 'pi-credit-card',
    type: 'CREDIT',
    ownerId: 'user-123',
    balance: 1500.5,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    creditCardInfo: {
      closingDay: 10,
      dueDay: 15,
      limit: 5000,
      brand: 'Mastercard',
    },
  };

  const mockAccounts: AccountDTO[] = [mockAccount];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('deve criar o serviço', () => {
    expect(service).toBeTruthy();
  });

  /**
   * Testes do método getHello
   * @description Verifica funcionamento da requisição GET para endpoint base
   */
  describe('getHello()', () => {
    it('deve fazer requisição GET para o health da API', () => {
      service.getHello().subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/health');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('deve tratar resposta de erro', () => {
      service.getHello().subscribe({
        next: () => expect.unreachable('deve falhar com erro 500'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error).toBe('Server error');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/health');
      expect(req.request.method).toBe('GET');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('deve tratar erro de rede', () => {
      service.getHello().subscribe({
        next: () => expect.unreachable('deve falhar com erro de rede'),
        error: (error) => {
          expect(error.status).toBe(0);
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/health');
      expect(req.request.method).toBe('GET');
      req.error(new ProgressEvent('Network error'));
    });
  });

  /**
   * Testes do método login
   * @description Verifica funcionamento da autenticação via API
   */
  describe('login()', () => {
    it('deve fazer requisição POST para endpoint de login', () => {
      service.login(mockLoginData).subscribe((response) => {
        expect(response).toEqual(mockLoginResponse);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginData);
      req.flush(mockLoginResponse);
    });

    it('deve tratar erro de login (401)', () => {
      service.login(mockLoginData).subscribe({
        next: () => expect.unreachable('deve falhar com erro 401'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error).toBe('Unauthorized');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('deve tratar erro de login (400)', () => {
      service.login(mockLoginData).subscribe({
        next: () => expect.unreachable('deve falhar com erro 400'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error).toBe('Bad request');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });

    it('deve tratar erro de rede no login', () => {
      service.login(mockLoginData).subscribe({
        next: () => expect.unreachable('deve falhar com erro de rede'),
        error: (error) => {
          expect(error.status).toBe(0);
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      req.error(new ProgressEvent('Network error'));
    });

    it('deve enviar cabeçalhos corretos', () => {
      service.login(mockLoginData).subscribe((response) => {
        expect(response).toEqual(mockLoginResponse);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginData);
      req.flush(mockLoginResponse);
    });
  });

  /**
   * Testes do método createAccount
   * @description Verifica funcionamento da criação de contas via API
   */
  describe('createAccount()', () => {
    it('deve fazer requisição POST para endpoint de contas', () => {
      service.createAccount(mockCreateAccountData).subscribe((response) => {
        expect(response).toEqual(mockAccount);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCreateAccountData);
      req.flush(mockAccount);
    });

    it('deve tratar erro de criação de conta (401)', () => {
      service.createAccount(mockCreateAccountData).subscribe({
        next: () => expect.unreachable('deve falhar com erro 401'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error).toBe('Unauthorized');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('POST');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('deve tratar erro de criação de conta (409 - nome duplicado)', () => {
      service.createAccount(mockCreateAccountData).subscribe({
        next: () => expect.unreachable('deve falhar com erro 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error).toBe('Account name already exists');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('POST');
      req.flush('Account name already exists', { status: 409, statusText: 'Conflict' });
    });

    it('deve tratar erro de criação de conta (400 - validação)', () => {
      service.createAccount(mockCreateAccountData).subscribe({
        next: () => expect.unreachable('deve falhar com erro 400'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error).toBe('Validation error');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('POST');
      req.flush('Validation error', { status: 400, statusText: 'Bad Request' });
    });

    it('deve tratar erro de rede na criação de conta', () => {
      service.createAccount(mockCreateAccountData).subscribe({
        next: () => expect.unreachable('deve falhar com erro de rede'),
        error: (error) => {
          expect(error.status).toBe(0);
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('POST');
      req.error(new ProgressEvent('Network error'));
    });

    it('deve criar conta padrão sem informações de cartão de crédito', () => {
      const standardAccountData: CreateAccountDTO = {
        name: 'Conta Padrão',
        color: '#FF5733',
        icon: 'pi-wallet',
        type: 'STANDARD',
      };

      const standardAccount: AccountDTO = {
        id: '456e7890-e89b-12d3-a456-426614174111',
        name: 'Conta Padrão',
        color: '#FF5733',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 1000.0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      service.createAccount(standardAccountData).subscribe((response) => {
        expect(response).toEqual(standardAccount);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(standardAccountData);
      req.flush(standardAccount);
    });
  });

  /**
   * Testes do método getAccounts
   * @description Verifica funcionamento da listagem de contas via API
   */
  describe('getAccounts()', () => {
    it('deve fazer requisição GET para endpoint de contas', () => {
      service.getAccounts().subscribe((response) => {
        expect(response).toEqual(mockAccounts);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('GET');
      req.flush(mockAccounts);
    });

    it('deve tratar erro de obtenção de contas (401)', () => {
      service.getAccounts().subscribe({
        next: () => expect.unreachable('deve falhar com erro 401'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error).toBe('Unauthorized');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('GET');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('deve tratar erro de obtenção de contas (500)', () => {
      service.getAccounts().subscribe({
        next: () => expect.unreachable('deve falhar com erro 500'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error).toBe('Internal server error');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('GET');
      req.flush('Internal server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('deve tratar erro de rede na obtenção de contas', () => {
      service.getAccounts().subscribe({
        next: () => expect.unreachable('deve falhar com erro de rede'),
        error: (error) => {
          expect(error.status).toBe(0);
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('GET');
      req.error(new ProgressEvent('Network error'));
    });

    it('deve retornar array vazio quando usuário não possui contas', () => {
      service.getAccounts().subscribe((response) => {
        expect(response).toEqual([]);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('deve retornar múltiplas contas', () => {
      const multipleAccounts: AccountDTO[] = [
        mockAccount,
        {
          id: '789e0123-e89b-12d3-a456-426614174222',
          name: 'Conta de Emergência',
          color: '#00FF00',
          icon: 'pi-money-bill',
          type: 'STANDARD',
          ownerId: 'user-123',
          balance: 5000.0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      service.getAccounts().subscribe((response) => {
        expect(response).toEqual(multipleAccounts);
        expect(response).toHaveLength(2);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/accounts');
      expect(req.request.method).toBe('GET');
      req.flush(multipleAccounts);
    });
  });

  describe('createTransaction()', () => {
    it('deve fazer requisição POST para endpoint de transações', () => {
      const payload: CreateTransactionDTO = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: '123e4567-e89b-12d3-a456-426614174099',
        amount: 10.5,
        type: 'EXPENSE',
        date: '2026-01-01T00:00:00.000Z',
        isPaid: true,
        description: 'Café',
        totalInstallments: 1,
      };

      const responseBody: TransactionDTO = {
        id: '123e4567-e89b-12d3-a456-426614174111',
        accountId: payload.accountId,
        categoryId: payload.categoryId,
        amount: payload.amount,
        description: payload.description ?? null,
        date: payload.date!,
        type: payload.type,
        isPaid: true,
        recurrenceId: null,
        installmentNumber: null,
        totalInstallments: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      service.createTransaction(payload).subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/transactions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(responseBody);
    });
  });

  describe('getTransactions()', () => {
    it('deve fazer requisição GET para endpoint de transações com accountId', () => {
      const accountId = '123e4567-e89b-12d3-a456-426614174000';

      const responseBody: { items: TransactionDTO[]; nextCursorId: string | null } = {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174111',
            accountId,
            categoryId: null,
            amount: 10.5,
            description: null,
            date: '2026-01-01T00:00:00.000Z',
            type: 'INCOME',
            isPaid: true,
            recurrenceId: null,
            installmentNumber: null,
            totalInstallments: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        nextCursorId: null,
      };

      service.getTransactions({ accountId }).subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne(
        (r: HttpRequest<unknown>) =>
          r.url === 'http://localhost:3333/api/transactions' &&
          r.params.get('accountId') === accountId,
      );
      expect(req.request.method).toBe('GET');
      req.flush(responseBody);
    });

    it('deve enviar parâmetros de data quando informados', () => {
      const from = '2026-01-01T00:00:00.000Z';
      const to = '2026-01-31T23:59:59.000Z';

      service.getTransactions({ from, to, limit: 30 }).subscribe((response) => {
        expect(response).toEqual({ items: [], nextCursorId: null });
      });

      const req = httpMock.expectOne(
        (r: HttpRequest<unknown>) =>
          r.url === 'http://localhost:3333/api/transactions' &&
          r.params.get('from') === from &&
          r.params.get('to') === to &&
          r.params.get('limit') === '30',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], nextCursorId: null });
    });
  });

  describe('getTransactionById()', () => {
    it('deve fazer requisição GET para endpoint de transação por id', () => {
      const id = '123e4567-e89b-12d3-a456-426614174111';

      const responseBody: TransactionDTO = {
        id,
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: null,
        amount: 10.5,
        description: 'Café',
        date: '2026-01-01T00:00:00.000Z',
        type: 'EXPENSE',
        isPaid: true,
        recurrenceId: null,
        installmentNumber: null,
        totalInstallments: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      service.getTransactionById(id).subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne(`http://localhost:3333/api/transactions/${id}`);
      expect(req.request.method).toBe('GET');
      req.flush(responseBody);
    });
  });

  describe('updateTransaction()', () => {
    it('deve fazer requisição PATCH para endpoint de transação por id', () => {
      const id = '123e4567-e89b-12d3-a456-426614174111';
      const payload: UpdateTransactionDTO = {
        description: 'Mercado',
        isPaid: false,
      };

      const responseBody: TransactionDTO = {
        id,
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: null,
        amount: 10.5,
        description: 'Mercado',
        date: '2026-01-01T00:00:00.000Z',
        type: 'EXPENSE',
        isPaid: false,
        recurrenceId: null,
        installmentNumber: null,
        totalInstallments: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };

      service.updateTransaction(id, payload).subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne(`http://localhost:3333/api/transactions/${id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(responseBody);
    });

    it('deve enviar scope quando informado', () => {
      const id = '123e4567-e89b-12d3-a456-426614174111';
      const payload: UpdateTransactionDTO = {
        description: 'Mercado',
      };

      const responseBody: TransactionDTO = {
        id,
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: null,
        amount: 10.5,
        description: 'Mercado',
        date: '2026-01-01T00:00:00.000Z',
        type: 'EXPENSE',
        isPaid: false,
        recurrenceId: 'rec-1',
        installmentNumber: 2,
        totalInstallments: 3,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };

      service.updateTransaction(id, payload, 'ALL').subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne(
        (r: HttpRequest<unknown>) =>
          r.url === `http://localhost:3333/api/transactions/${id}` &&
          r.params.get('scope') === 'ALL',
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(responseBody);
    });
  });

  describe('deleteTransaction()', () => {
    it('deve fazer requisição DELETE para endpoint de transação por id com scope', () => {
      const id = '123e4567-e89b-12d3-a456-426614174111';
      const responseBody: DeleteTransactionResponseDTO = { deletedIds: [id] };

      service.deleteTransaction(id, 'ONE').subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne(
        (r: HttpRequest<unknown>) =>
          r.url === `http://localhost:3333/api/transactions/${id}` &&
          r.params.get('scope') === 'ONE',
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(responseBody);
    });
  });

  describe('getCategories()', () => {
    it('deve fazer requisição GET para endpoint de categorias', () => {
      const responseBody: CategoryDTO[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174099',
          name: 'Mercado',
          icon: 'pi-shopping-cart',
          parentId: null,
          userId: 'user-1',
        },
      ];

      service.getCategories().subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/categories');
      expect(req.request.method).toBe('GET');
      req.flush(responseBody);
    });
  });

  describe('createCategory()', () => {
    it('deve fazer requisição POST para endpoint de categorias', () => {
      const payload: CreateCategoryDTO = {
        name: 'Mercado',
        icon: 'pi-shopping-cart',
        parentId: null,
      };

      const responseBody: CategoryDTO = {
        id: '123e4567-e89b-12d3-a456-426614174099',
        name: payload.name,
        icon: payload.icon,
        parentId: null,
        userId: 'user-1',
      };

      service.createCategory(payload).subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/categories');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(responseBody);
    });
  });

  describe('getAllowlist()', () => {
    it('deve fazer requisição GET com x-admin-key para allowlist', () => {
      const responseBody: AllowlistItem[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      service.getAllowlist('admin-key').subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/allowlist');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('x-admin-key')).toBe('admin-key');
      req.flush(responseBody);
    });
  });

  describe('addAllowlistEmail()', () => {
    it('deve fazer requisição POST com x-admin-key para allowlist', () => {
      const payload = { email: 'user@example.com' };
      const responseBody: AllowlistItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: payload.email,
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      service.addAllowlistEmail('admin-key', payload.email).subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/allowlist');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('x-admin-key')).toBe('admin-key');
      expect(req.request.body).toEqual(payload);
      req.flush(responseBody);
    });
  });

  describe('deleteAllowlistEmail()', () => {
    it('deve fazer requisição DELETE com x-admin-key para allowlist', () => {
      const responseBody: AllowlistDeleteResponse = { deleted: true };

      service.deleteAllowlistEmail('admin-key', 'user@example.com').subscribe((response) => {
        expect(response).toEqual(responseBody);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/allowlist/user%40example.com');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('x-admin-key')).toBe('admin-key');
      req.flush(responseBody);
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});

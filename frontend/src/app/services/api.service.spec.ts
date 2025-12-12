/**
 * Testes do serviço de API
 * @description Testes unitários do ApiService responsável por comunicação com backend
 * @since 1.0.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import {
  ApiResponseDTO,
  LoginDTO,
  LoginResponseDTO,
  CreateWalletDTO,
  WalletDTO,
} from '@dindinho/shared';

/**
 * Suite de testes do ApiService
 * @description Testa funcionalidades de comunicação com API backend
 */
describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const mockApiResponse: ApiResponseDTO = {
    message: 'Hello from backend!',
    docs: 'API documentation available at /docs',
    endpoints: {
      health: '/health',
      test_db: '/test-db',
    },
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
    },
    token: 'mock-jwt-token',
  };

  const mockCreateWalletData: CreateWalletDTO = {
    name: 'Cartão Nubank',
    color: '#8A2BE2',
    icon: 'pi-credit-card',
    type: 'CREDIT',
    closingDay: 10,
    dueDay: 15,
    limit: 5000,
    brand: 'Mastercard',
  };

  const mockWallet: WalletDTO = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Cartão Nubank',
    color: '#8A2BE2',
    icon: 'pi-credit-card',
    type: 'CREDIT',
    ownerId: 'user-123',
    balance: 1500.5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    creditCardInfo: {
      closingDay: 10,
      dueDay: 15,
      limit: 5000,
      brand: 'Mastercard',
    },
  };

  const mockWallets: WalletDTO[] = [mockWallet];

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
    it('deve fazer requisição GET para a URL base', () => {
      service.getHello().subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne('http://localhost:3333');
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

      const req = httpMock.expectOne('http://localhost:3333');
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

      const req = httpMock.expectOne('http://localhost:3333');
      expect(req.request.method).toBe('GET');
      req.error(new ErrorEvent('Network error'));
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
      req.error(new ErrorEvent('Network error'));
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
   * Testes do método createWallet
   * @description Verifica funcionamento da criação de carteiras via API
   */
  describe('createWallet()', () => {
    it('deve fazer requisição POST para endpoint de carteiras', () => {
      service.createWallet(mockCreateWalletData).subscribe((response) => {
        expect(response).toEqual(mockWallet);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCreateWalletData);
      req.flush(mockWallet);
    });

    it('deve tratar erro de criação de carteira (401)', () => {
      service.createWallet(mockCreateWalletData).subscribe({
        next: () => expect.unreachable('deve falhar com erro 401'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error).toBe('Unauthorized');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('POST');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('deve tratar erro de criação de carteira (409 - nome duplicado)', () => {
      service.createWallet(mockCreateWalletData).subscribe({
        next: () => expect.unreachable('deve falhar com erro 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error).toBe('Wallet name already exists');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('POST');
      req.flush('Wallet name already exists', { status: 409, statusText: 'Conflict' });
    });

    it('deve tratar erro de criação de carteira (400 - validação)', () => {
      service.createWallet(mockCreateWalletData).subscribe({
        next: () => expect.unreachable('deve falhar com erro 400'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error).toBe('Validation error');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('POST');
      req.flush('Validation error', { status: 400, statusText: 'Bad Request' });
    });

    it('deve tratar erro de rede na criação de carteira', () => {
      service.createWallet(mockCreateWalletData).subscribe({
        next: () => expect.unreachable('deve falhar com erro de rede'),
        error: (error) => {
          expect(error.status).toBe(0);
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('POST');
      req.error(new ErrorEvent('Network error'));
    });

    it('deve criar carteira padrão sem informações de cartão de crédito', () => {
      const standardWalletData: CreateWalletDTO = {
        name: 'Carteira Padrão',
        color: '#FF5733',
        icon: 'pi-wallet',
        type: 'STANDARD',
      };

      const standardWallet: WalletDTO = {
        id: '456e7890-e89b-12d3-a456-426614174111',
        name: 'Carteira Padrão',
        color: '#FF5733',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-123',
        balance: 1000.0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      service.createWallet(standardWalletData).subscribe((response) => {
        expect(response).toEqual(standardWallet);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(standardWalletData);
      req.flush(standardWallet);
    });
  });

  /**
   * Testes do método getWallets
   * @description Verifica funcionamento da listagem de carteiras via API
   */
  describe('getWallets()', () => {
    it('deve fazer requisição GET para endpoint de carteiras', () => {
      service.getWallets().subscribe((response) => {
        expect(response).toEqual(mockWallets);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('GET');
      req.flush(mockWallets);
    });

    it('deve tratar erro de obtenção de carteiras (401)', () => {
      service.getWallets().subscribe({
        next: () => expect.unreachable('deve falhar com erro 401'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error).toBe('Unauthorized');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('GET');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('deve tratar erro de obtenção de carteiras (500)', () => {
      service.getWallets().subscribe({
        next: () => expect.unreachable('deve falhar com erro 500'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error).toBe('Internal server error');
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('GET');
      req.flush('Internal server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('deve tratar erro de rede na obtenção de carteiras', () => {
      service.getWallets().subscribe({
        next: () => expect.unreachable('deve falhar com erro de rede'),
        error: (error) => {
          expect(error.status).toBe(0);
        },
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('GET');
      req.error(new ErrorEvent('Network error'));
    });

    it('deve retornar array vazio quando usuário não possui carteiras', () => {
      service.getWallets().subscribe((response) => {
        expect(response).toEqual([]);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('deve retornar múltiplas carteiras', () => {
      const multipleWallets: WalletDTO[] = [
        mockWallet,
        {
          id: '789e0123-e89b-12d3-a456-426614174222',
          name: 'Carteira de Emergência',
          color: '#00FF00',
          icon: 'pi-money-bill',
          type: 'STANDARD',
          ownerId: 'user-123',
          balance: 5000.0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      service.getWallets().subscribe((response) => {
        expect(response).toEqual(multipleWallets);
        expect(response).toHaveLength(2);
      });

      const req = httpMock.expectOne('http://localhost:3333/api/wallets');
      expect(req.request.method).toBe('GET');
      req.flush(multipleWallets);
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});

/** @vitest-environment jsdom */
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { InviteService } from './invite.service';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';
import { of, throwError, firstValueFrom } from 'rxjs';
import { InviteStatus, ResourcePermission, CreateInviteDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('InviteService', () => {
  let service: InviteService;
  let apiServiceSpy: {
    get: Mock;
    post: Mock;
    patch: Mock;
    delete: Mock;
  };
  let loggerServiceSpy: {
    info: Mock;
    error: Mock;
  };

  const mockInvite = {
    id: '1',
    token: 'token123',
    email: 'test@example.com',
    sender: { id: 'u1', name: 'Sender' },
    status: InviteStatus.PENDING,
    expiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    accounts: [
      { accountId: 'acc1', accountName: 'Account 1', permission: ResourcePermission.VIEWER },
    ],
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    apiServiceSpy = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    loggerServiceSpy = {
      info: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        InviteService,
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: LoggerService, useValue: loggerServiceSpy },
      ],
    });
    service = TestBed.inject(InviteService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  describe('createInvite', () => {
    it('deve criar um convite e atualizar o estado sentInvites', async () => {
      const dto = { email: 'test@example.com', accounts: [], expiresInDays: 7 };
      apiServiceSpy.post.mockReturnValue(of(mockInvite));

      const invite = await firstValueFrom(service.createInvite(dto));

      expect(invite).toEqual(mockInvite);
      expect(service.sentInvites()).toContain(mockInvite);
      expect(apiServiceSpy.post).toHaveBeenCalledWith('invites', dto);
    });

    it('deve lidar com erro ao criar convite', async () => {
      const error = { error: { message: 'Erro Customizado' } };
      apiServiceSpy.post.mockReturnValue(throwError(() => error));

      const dto: CreateInviteDTO = { email: 'invalid@example.com', accounts: [], expiresInDays: 1 };
      try {
        await firstValueFrom(service.createInvite(dto));
      } catch (err) {
        expect(err).toEqual(error);
        expect(service.error()).toBe('Erro Customizado');
      }
    });
  });

  describe('getInviteByToken', () => {
    it('deve buscar convite pelo token', async () => {
      apiServiceSpy.get.mockReturnValue(of(mockInvite));

      const invite = await firstValueFrom(service.getInviteByToken('token123'));

      expect(invite).toEqual(mockInvite);
      expect(apiServiceSpy.get).toHaveBeenCalledWith('invites/t/token123');
    });

    it('deve lidar com erro ao buscar convite por token', async () => {
      const error = { error: { message: 'Token inválido' } };
      apiServiceSpy.get.mockReturnValue(throwError(() => error));

      try {
        await firstValueFrom(service.getInviteByToken('invalid'));
      } catch (err) {
        expect(err).toEqual(error);
        expect(service.error()).toBe('Token inválido');
      }
    });
  });

  describe('getInvite', () => {
    it('deve buscar convite pelo ID', async () => {
      apiServiceSpy.get.mockReturnValue(of(mockInvite));

      const invite = await firstValueFrom(service.getInvite('1'));

      expect(invite).toEqual(mockInvite);
      expect(apiServiceSpy.get).toHaveBeenCalledWith('invites/1');
    });

    it('deve lidar com erro ao buscar convite por ID', async () => {
      const error = { error: { message: 'Convite não encontrado' } };
      apiServiceSpy.get.mockReturnValue(throwError(() => error));

      try {
        await firstValueFrom(service.getInvite('non-existent'));
      } catch (err) {
        expect(err).toEqual(error);
        expect(service.error()).toBe('Convite não encontrado');
      }
    });
  });

  describe('respondToInvite', () => {
    it('deve atualizar o status do convite e atualizar na lista de recebidos', async () => {
      // Mock estado inicial
      service['state'].set({
        sentInvites: [],
        receivedInvites: [mockInvite],
        loading: false,
        error: null,
      });

      const updatedInvite = { ...mockInvite, status: InviteStatus.ACCEPTED };
      apiServiceSpy.patch.mockReturnValue(of(updatedInvite));

      await firstValueFrom(service.respondToInvite('1', InviteStatus.ACCEPTED));

      const received = service.receivedInvites();
      expect(received[0].status).toBe(InviteStatus.ACCEPTED);
      expect(apiServiceSpy.patch).toHaveBeenCalledWith('invites/1', {
        status: InviteStatus.ACCEPTED,
      });
    });

    it('deve atualizar o status do convite e manter outros inalterados na lista', async () => {
      const otherInvite = { ...mockInvite, id: '2' };
      const updatedInvite = { ...mockInvite, status: InviteStatus.ACCEPTED };
      apiServiceSpy.patch.mockReturnValue(of(updatedInvite));

      service['state'].set({
        sentInvites: [],
        receivedInvites: [mockInvite, otherInvite],
        loading: false,
        error: null,
      });

      await firstValueFrom(service.respondToInvite('1', InviteStatus.ACCEPTED));

      const received = service.receivedInvites();
      expect(received).toHaveLength(2);
      expect(received.find((i) => i.id === '1')?.status).toBe(InviteStatus.ACCEPTED);
      expect(received.find((i) => i.id === '2')?.status).toBe(InviteStatus.PENDING);
    });

    it('deve usar mensagem padrão se o erro não contiver mensagem', async () => {
      // Usando respondToInvite para testar handleError indiretamente
      const errorWithoutMessage = { error: {} };
      apiServiceSpy.patch.mockReturnValue(throwError(() => errorWithoutMessage));

      try {
        await firstValueFrom(service.respondToInvite('1', InviteStatus.ACCEPTED));
      } catch {
        expect(service.error()).toBe('Erro ao aceitar convite');
      }
    });

    it('deve lidar com erro ao aceitar convite', async () => {
      const error = { error: { message: 'Erro ao aceitar' } };
      apiServiceSpy.patch.mockReturnValue(throwError(() => error));

      try {
        await firstValueFrom(service.respondToInvite('1', InviteStatus.ACCEPTED));
      } catch (err) {
        expect(err).toEqual(error);
        expect(service.error()).toBe('Erro ao aceitar');
      }
    });

    it('deve lidar com erro ao rejeitar convite', async () => {
      const error = { error: { message: 'Erro ao rejeitar' } };
      apiServiceSpy.patch.mockReturnValue(throwError(() => error));

      try {
        await firstValueFrom(service.respondToInvite('1', InviteStatus.REJECTED));
      } catch (err) {
        expect(err).toEqual(error);
        expect(service.error()).toBe('Erro ao rejeitar');
      }
    });
  });

  describe('loadSentInvites', () => {
    it('deve listar convites enviados e atualizar o estado', () => {
      const invites = [mockInvite];
      apiServiceSpy.get.mockReturnValue(of(invites));

      service.loadSentInvites();

      expect(service.sentInvites()).toEqual(invites);
      expect(apiServiceSpy.get).toHaveBeenCalledWith('invites/sent');
    });

    it('deve lidar com erro ao carregar convites enviados', () => {
      const error = { error: { message: 'Erro API Enviados' } };
      apiServiceSpy.get.mockReturnValue(throwError(() => error));

      service.loadSentInvites();

      expect(service.error()).toBe('Erro API Enviados');
    });
  });

  describe('loadReceivedInvites', () => {
    it('deve listar convites recebidos e atualizar o estado', () => {
      const invites = [mockInvite];
      apiServiceSpy.get.mockReturnValue(of(invites));

      service.loadReceivedInvites();

      expect(service.receivedInvites()).toEqual(invites);
      expect(apiServiceSpy.get).toHaveBeenCalledWith('invites/pending');
    });

    it('deve lidar com erro ao carregar convites recebidos', () => {
      const error = { error: { message: 'Erro API Recebidos' } };
      apiServiceSpy.get.mockReturnValue(throwError(() => error));

      service.loadReceivedInvites();

      expect(service.error()).toBe('Erro API Recebidos');
    });
  });

  describe('revokeInvite', () => {
    it('deve revogar um convite e remover da lista sentInvites', async () => {
      // Mock estado inicial
      service['state'].set({
        sentInvites: [mockInvite],
        receivedInvites: [],
        loading: false,
        error: null,
      });

      apiServiceSpy.delete.mockReturnValue(of(undefined));

      await firstValueFrom(service.revokeInvite('1'));

      expect(service.sentInvites()).toHaveLength(0);
      expect(apiServiceSpy.delete).toHaveBeenCalledWith('invites/1');
    });

    it('deve lidar com erro ao revogar convite', async () => {
      const error = { error: { message: 'Erro ao revogar' } };
      apiServiceSpy.delete.mockReturnValue(throwError(() => error));

      try {
        await firstValueFrom(service.revokeInvite('1'));
      } catch (err) {
        expect(err).toEqual(error);
        expect(service.error()).toBe('Erro ao revogar');
      }
    });
  });

  describe('pendingReceivedInvites', () => {
    it('deve filtrar apenas convites pendentes', () => {
      const acceptedInvite = { ...mockInvite, id: '2', status: InviteStatus.ACCEPTED };
      service['state'].set({
        sentInvites: [],
        receivedInvites: [mockInvite, acceptedInvite],
        loading: false,
        error: null,
      });

      const pending = service.pendingReceivedInvites();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('1');
    });
  });
});

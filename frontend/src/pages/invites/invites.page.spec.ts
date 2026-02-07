/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvitesPage } from './invites.page';
import { InviteService } from '../../app/services/invite.service';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { InviteStatus, InviteDTO, ResourcePermission } from '@dindinho/shared';
import { signal, WritableSignal } from '@angular/core';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

describe('InvitesPage', () => {
  let fixture: ComponentFixture<InvitesPage>;
  let component: InvitesPage;
  let inviteServiceMock: {
    receivedInvites: WritableSignal<InviteDTO[]>;
    sentInvites: WritableSignal<InviteDTO[]>;
    pendingReceivedInvites: WritableSignal<InviteDTO[]>;
    isLoading: WritableSignal<boolean>;
    loadReceivedInvites: ReturnType<typeof vi.fn>;
    loadSentInvites: ReturnType<typeof vi.fn>;
    respondToInvite: ReturnType<typeof vi.fn>;
    revokeInvite: ReturnType<typeof vi.fn>;
  };
  let messageService: MessageService;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    inviteServiceMock = {
      receivedInvites: signal([]),
      sentInvites: signal([]),
      pendingReceivedInvites: signal([]),
      isLoading: signal(false),
      loadReceivedInvites: vi.fn(),
      loadSentInvites: vi.fn(),
      respondToInvite: vi.fn(),
      revokeInvite: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [InvitesPage, ButtonModule, CardModule, TagModule, ToastModule],
      providers: [{ provide: InviteService, useValue: inviteServiceMock }, MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(InvitesPage);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar a seção de convites recebidos', () => {
    const section = fixture.nativeElement.querySelector('[data-testid="received-invites-section"]');
    expect(section).toBeTruthy();
  });

  it('deve exibir mensagem de lista vazia quando não há convites recebidos', () => {
    inviteServiceMock.receivedInvites.set([]);
    fixture.detectChanges();
    const emptyMsg = fixture.nativeElement.querySelector(
      '[data-testid="received-invites-section"] p-card p',
    );
    expect(emptyMsg.textContent).toContain('Nenhum convite recebido');
  });

  it('deve renderizar convites recebidos quando existirem', () => {
    const mockInvites: InviteDTO[] = [
      {
        id: '1',
        token: 'token-1',
        email: 'destinatario@exemplo.com',
        sender: { id: 's-1', name: 'João' },
        status: InviteStatus.PENDING,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        accounts: [
          { accountId: 'acc-1', accountName: 'Corrente', permission: ResourcePermission.EDITOR },
        ],
      },
    ];
    inviteServiceMock.receivedInvites.set(mockInvites);
    fixture.detectChanges();

    const inviteCards = fixture.nativeElement.querySelectorAll(
      '[data-testid="received-invites-section"] p-card',
    );
    // O primeiro p-card pode ser o de "Nenhum convite" se não for removido pelo @if,
    // mas o template usa @if (inviteService.receivedInvites().length === 0)
    expect(inviteCards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('João');
  });

  it('deve chamar respondToInvite ao aceitar um convite', () => {
    const inviteId = '123';
    inviteServiceMock.respondToInvite.mockReturnValue(of({}));
    const addSpy = vi.spyOn(messageService, 'add');

    // @ts-expect-error - acessando método protected para teste
    component.onAccept(inviteId);

    expect(inviteServiceMock.respondToInvite).toHaveBeenCalledWith(inviteId, InviteStatus.ACCEPTED);
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        detail: 'Convite aceito com sucesso!',
      }),
    );
  });

  it('deve exibir erro ao falhar em aceitar um convite', () => {
    const inviteId = '123';
    inviteServiceMock.respondToInvite.mockReturnValue(
      throwError(() => ({ error: { message: 'Erro ao aceitar' } })),
    );
    const addSpy = vi.spyOn(messageService, 'add');

    // @ts-expect-error - acessando método protected para teste de aceite
    component.onAccept(inviteId);

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Erro ao aceitar',
      }),
    );
  });

  it('deve chamar revokeInvite ao revogar um convite enviado', () => {
    const inviteId = '456';
    inviteServiceMock.revokeInvite.mockReturnValue(of({}));
    const addSpy = vi.spyOn(messageService, 'add');

    // @ts-expect-error - acessando método protected para teste de revogação
    component.onRevoke(inviteId);

    expect(inviteServiceMock.revokeInvite).toHaveBeenCalledWith(inviteId);
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        detail: 'Convite revogado com sucesso!',
      }),
    );
  });
});

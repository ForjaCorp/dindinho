/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShareAccountDialogComponent } from './share-account-dialog.component';
import { InviteService } from '../../services/invite.service';
import { AccountService } from '../../services/account.service';
import { MessageService } from 'primeng/api';
import { Clipboard } from '@angular/cdk/clipboard';
import { of, throwError, Subject, Observable } from 'rxjs';
import { ResourcePermission, AccountDTO } from '@dindinho/shared';
import { signal, WritableSignal } from '@angular/core';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('ShareAccountDialogComponent', () => {
  let fixture: ComponentFixture<ShareAccountDialogComponent>;
  let component: ShareAccountDialogComponent;
  let inviteServiceMock: {
    createInvite: ReturnType<typeof vi.fn>;
    isLoading: WritableSignal<boolean>;
  };
  let accountServiceMock: {
    accounts: WritableSignal<Partial<AccountDTO>[]>;
  };
  let messageServiceMock: {
    add: ReturnType<typeof vi.fn>;
    messageObserver: Observable<unknown>;
    clear: ReturnType<typeof vi.fn>;
  };
  let clipboardMock: {
    copy: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    inviteServiceMock = {
      createInvite: vi.fn(),
      isLoading: signal(false),
    };

    accountServiceMock = {
      accounts: signal([
        { id: 'acc-1', name: 'Conta 1', permission: ResourcePermission.OWNER },
        { id: 'acc-2', name: 'Conta 2', permission: ResourcePermission.VIEWER },
      ]),
    };

    messageServiceMock = {
      add: vi.fn(),
      messageObserver: new Subject<unknown>().asObservable(),
      clear: vi.fn(),
    };

    clipboardMock = {
      copy: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShareAccountDialogComponent],
      providers: [
        { provide: InviteService, useValue: inviteServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: Clipboard, useValue: clipboardMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareAccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve filtrar apenas contas OWNER nas opções', () => {
    const options = component.accountOptions();
    expect(options.length).toBe(1);
    expect(options[0].id).toBe('acc-1');
  });

  it('deve abrir o diálogo com IDs de conta pré-selecionados', () => {
    const accountIds = ['acc-1'];
    component.open(accountIds);
    expect(component.visible()).toBe(true);
    expect(component.form.get('accountIds')?.value).toEqual(accountIds);
  });

  it('deve submeter o formulário com sucesso', () => {
    const mockInvite = { id: 'invite-123' };
    inviteServiceMock.createInvite.mockReturnValue(of(mockInvite));

    component.form.patchValue({
      email: 'test@example.com',
      accountIds: ['acc-1'],
      permission: ResourcePermission.EDITOR,
    });

    component.onSubmit();

    expect(inviteServiceMock.createInvite).toHaveBeenCalledWith({
      email: 'test@example.com',
      accounts: [{ accountId: 'acc-1', permission: ResourcePermission.EDITOR }],
      expiresInDays: 7,
    });
    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Sucesso',
      }),
    );
    expect(component.inviteLink()).toContain('invite-123');
  });

  it('deve exibir erro ao falhar na submissão', () => {
    inviteServiceMock.createInvite.mockReturnValue(
      throwError(() => ({ error: { message: 'Erro de API' } })),
    );

    component.form.patchValue({
      email: 'test@example.com',
      accountIds: ['acc-1'],
      permission: ResourcePermission.VIEWER,
    });

    component.onSubmit();

    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Erro de API',
      }),
    );
  });

  it('deve copiar link para o clipboard', () => {
    component.inviteLink.set('http://localhost/invite/123');
    component.copyToClipboard();
    expect(clipboardMock.copy).toHaveBeenCalledWith('http://localhost/invite/123');
    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        summary: 'Copiado',
      }),
    );
  });
});

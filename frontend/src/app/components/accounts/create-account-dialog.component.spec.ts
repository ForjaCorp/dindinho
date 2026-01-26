import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { CreateAccountDialogComponent } from './create-account-dialog.component';
import { AccountService } from '../../services/account.service';
import { MessageService } from 'primeng/api';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('CreateAccountDialogComponent', () => {
  let fixture: ComponentFixture<CreateAccountDialogComponent>;
  let messageServiceMock: { add: ReturnType<typeof vi.fn> };
  let accountServiceMock: {
    isLoading: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
    createAccount: ReturnType<typeof vi.fn>;
    updateAccount: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    messageServiceMock = { add: vi.fn() };
    accountServiceMock = {
      isLoading: vi.fn(() => false),
      clearError: vi.fn(),
      createAccount: vi.fn(() => of(null)),
      updateAccount: vi.fn(() => of(null)),
      error: vi.fn(() => null),
    };

    await TestBed.configureTestingModule({
      imports: [CreateAccountDialogComponent],
      providers: [
        {
          provide: AccountService,
          useValue: accountServiceMock,
        },
        {
          provide: MessageService,
          useValue: messageServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAccountDialogComponent);
  });

  it('deve abrir o diálogo com tipo padrão ao chamar show()', () => {
    fixture.componentInstance.resetForm();
    fixture.componentInstance.show();
    fixture.detectChanges();

    expect(fixture.componentInstance.visible()).toBe(true);
    expect(fixture.componentInstance.form.controls.type.value).toBe('STANDARD');
  });

  it('deve abrir o diálogo com tipo de cartão ao chamar showForType', () => {
    fixture.componentInstance.resetForm();
    fixture.componentInstance.showForType('CREDIT');
    fixture.detectChanges();

    expect(fixture.componentInstance.visible()).toBe(true);
    expect(fixture.componentInstance.form.controls.type.value).toBe('CREDIT');
  });

  it('deve abrir o diálogo em modo edição ao chamar showForEdit', () => {
    fixture.componentInstance.showForEdit({
      id: 'account-1',
      name: 'Conta',
      color: '#10b981',
      icon: 'pi-wallet',
      type: 'STANDARD',
      ownerId: 'user-1',
      balance: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.visible()).toBe(true);
    expect(fixture.componentInstance.form.controls.name.value).toBe('Conta');
  });

  it('deve exibir toast de sucesso ao criar conta', () => {
    const component = fixture.componentInstance;
    component.resetForm();
    component.show();
    component.form.controls.name.setValue('Conta');
    component.form.controls.color.setValue('#10b981');
    fixture.detectChanges();

    component.onSubmit();

    expect(accountServiceMock.createAccount).toHaveBeenCalledTimes(1);
    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Conta criada' }),
    );
  });

  it('deve exibir toast de erro ao falhar ao criar conta', () => {
    accountServiceMock.error.mockReturnValue('Falha ao salvar');
    accountServiceMock.createAccount.mockReturnValue(throwError(() => new Error('network')));

    const component = fixture.componentInstance;
    component.resetForm();
    component.show();
    component.form.controls.name.setValue('Conta');
    component.form.controls.color.setValue('#10b981');
    fixture.detectChanges();

    component.onSubmit();

    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Erro ao criar conta' }),
    );
  });

  it('deve exibir toast de sucesso ao atualizar conta', () => {
    const component = fixture.componentInstance;
    component.showForEdit({
      id: 'account-1',
      name: 'Conta',
      color: '#10b981',
      icon: 'pi-wallet',
      type: 'STANDARD',
      ownerId: 'user-1',
      balance: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    fixture.detectChanges();

    component.form.controls.name.setValue('Conta Editada');
    fixture.detectChanges();

    component.onSubmit();

    expect(accountServiceMock.updateAccount).toHaveBeenCalledTimes(1);
    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Conta atualizada' }),
    );
  });
});

import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { CreateAccountDialogComponent } from './create-account-dialog.component';
import { AccountService } from '../../services/account.service';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('CreateAccountDialogComponent', () => {
  let fixture: ComponentFixture<CreateAccountDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateAccountDialogComponent],
      providers: [
        {
          provide: AccountService,
          useValue: {
            isLoading: vi.fn(() => false),
            clearError: vi.fn(),
            createAccount: vi.fn(() => of(null)),
            updateAccount: vi.fn(() => of(null)),
          },
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
});

/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AccountFilterComponent } from './account-filter.component';
import { AccountService } from '../services/account.service';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AccountDTO } from '@dindinho/shared';
import { MultiSelect } from 'primeng/multiselect';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('AccountFilterComponent', () => {
  let component: AccountFilterComponent;
  let fixture: ComponentFixture<AccountFilterComponent>;
  let accountServiceMock: {
    accounts: ReturnType<typeof signal<AccountDTO[]>>;
    loadAccounts: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    accountServiceMock = {
      accounts: signal([
        {
          id: '1',
          name: 'Conta A',
          color: '#000',
          icon: 'pi-wallet',
          type: 'STANDARD',
          balance: 0,
          ownerId: '1',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          name: 'Conta B',
          color: '#000',
          icon: 'pi-wallet',
          type: 'STANDARD',
          balance: 0,
          ownerId: '1',
          createdAt: '',
          updatedAt: '',
        },
      ]),
      loadAccounts: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AccountFilterComponent],
      providers: [{ provide: AccountService, useValue: accountServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar contas ao inicializar', () => {
    expect(accountServiceMock.loadAccounts).toHaveBeenCalled();
  });

  it('deve renderizar o multiselect com as contas', () => {
    // Usando By.directive para garantir que pegamos a instância do componente PrimeNG
    const multiselectDebugEl = fixture.debugElement.query(By.directive(MultiSelect));
    expect(multiselectDebugEl).toBeTruthy();

    // Verificando as options na instância do componente
    const multiselectInstance = multiselectDebugEl.componentInstance as MultiSelect;
    expect(multiselectInstance.options).toEqual(accountServiceMock.accounts());
  });

  it('deve atualizar selectedIds quando o input selected for definido', () => {
    component.selected = ['1'];
    fixture.detectChanges();
    // Acessando o signal protegido via casting para unknown primeiro para contornar verificação estrita,
    // já que é um teste de estado interno que reflete na UI
    const selectedIds = (component as unknown as { selectedIds: () => string[] }).selectedIds();
    expect(selectedIds).toEqual(['1']);
  });

  it('deve emitir selectionChange ao selecionar uma conta', () => {
    const spy = vi.spyOn(component.selectionChange, 'emit');
    const newSelection = ['1', '2'];

    // Simulando o evento de mudança do p-multiselect chamando o método handler diretamente
    // pois simular eventos de componentes de terceiros via DOM pode ser frágil
    (component as unknown as { onSelectionChange: (v: string[]) => void }).onSelectionChange(
      newSelection,
    );

    expect(spy).toHaveBeenCalledWith(newSelection);

    const selectedIds = (component as unknown as { selectedIds: () => string[] }).selectedIds();
    expect(selectedIds).toEqual(newSelection);
  });
});

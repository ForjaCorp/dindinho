/**
 * Testes de unidade para o componente Dashboard.
 *
 * Este arquivo contém testes para garantir o funcionamento correto
 * do componente Dashboard, que exibe o painel principal do aplicativo
 * com informações financeiras e atalhos rápidos.
 *
 * @see {@link https://angular.io/guide/testing} Documentação oficial de testes do Angular
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DashboardComponent } from './dashboard.page';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  /**
   * Configura o ambiente de teste antes de cada caso de teste.
   */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, ButtonModule, CardModule],
      providers: [
        provideRouter([]), // Fornece o roteador para testes
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Testa se o componente é criado com sucesso.
   */
  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Testa se o título "Saldo Total" está sendo exibido corretamente.
   */
  it('deve exibir o título "Saldo Total"', () => {
    const titleElement = fixture.nativeElement.querySelector('[data-testid="balance-title"]');
    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toContain('Saldo Total');
  });

  /**
   * Testa se os botões de receita e despesa estão sendo exibidos.
   */
  it('deve exibir os botões de receita e despesa', () => {
    const incomeButton = fixture.nativeElement.querySelector('[data-testid="income-button"]');
    const expenseButton = fixture.nativeElement.querySelector('[data-testid="expense-button"]');

    expect(incomeButton).toBeTruthy();
    expect(expenseButton).toBeTruthy();
    expect(incomeButton.textContent).toContain('Receita');
    expect(expenseButton.textContent).toContain('Despesa');
  });

  /**
   * Testa se os atalhos de navegação estão sendo exibidos corretamente.
   */
  it('deve exibir os atalhos de navegação', () => {
    const shortcutsSection = fixture.nativeElement.querySelector(
      '[data-testid="quick-links-section"]',
    );
    const textosEsperados = ['Contas', 'Cartões', 'Relatórios', 'Ajustes'];

    textosEsperados.forEach((texto) => {
      expect(shortcutsSection.textContent).toContain(texto);
    });
  });

  /**
   * Testa se a seção de transações recentes está sendo exibida.
   */
  it('deve exibir a seção de transações recentes', () => {
    const transactionsSection = fixture.nativeElement.querySelector(
      '[data-testid="transactions-section"]',
    );
    const viewAllButton = fixture.nativeElement.querySelector(
      '[data-testid="view-all-transactions"]',
    );

    expect(transactionsSection).toBeTruthy();
    expect(viewAllButton).toBeTruthy();
    expect(transactionsSection.textContent).toContain('Últimas Transações');
    expect(transactionsSection.textContent).toContain('Nenhuma transação recente');
    expect(viewAllButton.textContent).toContain('Ver todas');
  });
});

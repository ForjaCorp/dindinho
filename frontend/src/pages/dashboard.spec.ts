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
        provideRouter([]), // Fornece o roteador para os testes
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
    const saldoCard = fixture.nativeElement.querySelector('[data-testid="balance-card"]');
    expect(saldoCard.textContent).toContain('Saldo Total');
  });

  /**
   * Testa se os botões de receita e despesa estão sendo exibidos.
   */
  it('deve exibir os botões de receita e despesa', () => {
    const receitaButton = fixture.nativeElement.querySelector('[data-testid="income-button"]');
    const despesaButton = fixture.nativeElement.querySelector('[data-testid="expense-button"]');

    expect(receitaButton).toBeTruthy();
    expect(despesaButton).toBeTruthy();
    expect(receitaButton.textContent).toContain('Receita');
    expect(despesaButton.textContent).toContain('Despesa');
  });

  /**
   * Testa se os atalhos estão sendo exibidos corretamente.
   */
  it('deve exibir os atalhos de navegação', () => {
    const atalhosSection = fixture.nativeElement.querySelector(
      '[data-testid="quick-links-section"]',
    );
    const textosEsperados = ['Contas', 'Cartões', 'Relatórios', 'Ajustes'];

    textosEsperados.forEach((texto) => {
      expect(atalhosSection.textContent).toContain(texto);
    });
  });

  /**
   * Testa se a seção de transações recentes está sendo exibida.
   */
  it('deve exibir a seção de transações recentes', () => {
    const transacoesSection = fixture.nativeElement.querySelector(
      '[data-testid="transactions-section"]',
    );
    const verTodasButton = fixture.nativeElement.querySelector(
      '[data-testid="view-all-transactions"]',
    );

    expect(transacoesSection).toBeTruthy();
    expect(verTodasButton).toBeTruthy();
    expect(transacoesSection.textContent).toContain('Últimas Transações');
    expect(transacoesSection.textContent).toContain('Nenhuma transação recente');
    expect(verTodasButton.textContent).toContain('Ver todas');
  });
});

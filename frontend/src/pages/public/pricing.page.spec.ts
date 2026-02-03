// @vitest-environment jsdom
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PricingPage } from './pricing.page';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

/**
 * @description
 * Testes para a página de Preços.
 */
describe('PricingPage', () => {
  let component: PricingPage;
  let fixture: ComponentFixture<PricingPage>;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir os planos de preços', () => {
    const content = fixture.nativeElement.querySelector('[data-testid="pricing-page"]');
    expect(content.textContent).toContain('Básico');
    expect(content.textContent).toContain('Pro');
    expect(content.textContent).toContain('R$ 0');
    expect(content.textContent).toContain('R$ 19');
  });
});

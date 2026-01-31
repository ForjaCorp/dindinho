// @vitest-environment jsdom
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

@Component({
  standalone: true,
  template: '<div data-testid="dummy-route">Dummy</div>',
})
class DummyRouteComponent {}

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([
          {
            path: 'reports',
            component: DummyRouteComponent,
            data: { title: 'Relatórios', maxWidth: '7xl' },
          },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar o título e o logo', () => {
    const titleElement = fixture.nativeElement.querySelector('[data-testid="app-title"]');
    const logoElement = fixture.nativeElement.querySelector('[data-testid="logo"]');

    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toContain('Dindinho');
    expect(logoElement).toBeTruthy();
  });

  it('deve renderizar a navegação inferior', () => {
    const navElement = fixture.nativeElement.querySelector('[data-testid="bottom-navigation"]');
    const navItems = [
      { testId: 'nav-home', text: 'Início' },
      { testId: 'nav-transactions', text: 'Transações' },
      { testId: 'add-button' },
      { testId: 'nav-reports', text: 'Relatórios' },
      { testId: 'nav-profile', text: 'Perfil' },
    ];

    expect(navElement).toBeTruthy();

    navItems.forEach((item) => {
      const element = fixture.nativeElement.querySelector(`[data-testid="${item.testId}"]`);
      expect(element).toBeTruthy();

      if (item.text) {
        expect(element.textContent).toContain(item.text);
      }
    });
  });

  it('deve renderizar a área principal com router-outlet', () => {
    const mainElement = fixture.nativeElement.querySelector('[data-testid="main-content"]');
    expect(mainElement).toBeTruthy();

    const routerOutlet = mainElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });

  it('deve centralizar o espaçamento no container da página', () => {
    const container = fixture.nativeElement.querySelector('[data-testid="page-container"]');
    expect(container).toBeTruthy();

    const className = (container as HTMLElement).className;
    expect(className).toContain('px-4');
    expect(className).toContain('md:px-6');
    expect(className).toContain('pb-[calc(6rem+env(safe-area-inset-bottom))]');
  });

  it('deve manter padding consistente no header e na bottom bar', () => {
    const header = fixture.nativeElement.querySelector('header');
    const bottomNav = fixture.nativeElement.querySelector('[data-testid="bottom-navigation"]');
    expect(header).toBeTruthy();
    expect(bottomNav).toBeTruthy();

    const headerClass = (header as HTMLElement).className;
    const navClass = (bottomNav as HTMLElement).className;

    expect(headerClass).toContain('px-4');
    expect(headerClass).toContain('md:px-6');
    expect(navClass).toContain('px-4');
    expect(navClass).toContain('md:px-6');
  });

  it('deve atualizar o título e o maxWidth a partir da rota ativa', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/reports');
    await fixture.whenStable();
    fixture.detectChanges();

    const titleElement = fixture.nativeElement.querySelector('[data-testid="app-title"]');
    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toContain('Relatórios');

    const container = fixture.nativeElement.querySelector('[data-testid="page-container"]');
    expect(container).toBeTruthy();
    expect((container as HTMLElement).className).toContain('max-w-7xl');
  });
});

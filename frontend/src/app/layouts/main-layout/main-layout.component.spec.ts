import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render title and logo', () => {
    const titleElement = fixture.nativeElement.querySelector('[data-testid="app-title"]');
    const logoElement = fixture.nativeElement.querySelector('[data-testid="logo"]');

    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toContain('Dindinho');
    expect(logoElement).toBeTruthy();
  });

  it('should render bottom navigation', () => {
    const navElement = fixture.nativeElement.querySelector('[data-testid="bottom-navigation"]');
    const navItems = [
      { testId: 'nav-home', text: 'Início' },
      { testId: 'nav-wallet', text: 'Carteira' },
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

  it('should render main content area with router-outlet', () => {
    const mainElement = fixture.nativeElement.querySelector('[data-testid="main-content"]');
    expect(mainElement).toBeTruthy();

    const routerOutlet = mainElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });
});

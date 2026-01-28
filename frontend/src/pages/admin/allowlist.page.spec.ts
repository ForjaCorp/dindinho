import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AllowlistPage } from './allowlist.page';
import { AllowlistService } from '../../app/services/allowlist.service';
import { of } from 'rxjs';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('AllowlistPage', () => {
  let fixture: ComponentFixture<AllowlistPage>;
  let service: AllowlistService;

  beforeEach(async () => {
    const serviceSpy = {
      items: vi.fn(() => []),
      isLoading: vi.fn(() => false),
      error: vi.fn(() => null),
      adminKey: vi.fn(() => null),
      setAdminKey: vi.fn(),
      loadAllowlist: vi.fn(),
      addEmail: vi.fn(() =>
        of({
          id: 'id-1',
          email: 'user@example.com',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
      deleteEmail: vi.fn(() => of({ deleted: true })),
    } as unknown as AllowlistService;

    await TestBed.configureTestingModule({
      imports: [AllowlistPage],
      providers: [{ provide: AllowlistService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AllowlistPage);
    service = TestBed.inject(AllowlistService);
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="allowlist-admin-page"]'),
    ).toBeTruthy();
  });

  it('deve exibir header e botão de recarregar', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="reload-btn"]')).toBeTruthy();
  });

  it('deve permitir salvar chave admin', () => {
    const component = fixture.componentInstance as unknown as {
      adminKeyControl: { setValue: (value: string) => void };
      onSaveAdminKey: () => void;
    };

    component.adminKeyControl.setValue('admin-key');
    component.onSaveAdminKey();
    fixture.detectChanges();

    expect(service.setAdminKey).toHaveBeenCalledWith('admin-key');
    expect(service.loadAllowlist).toHaveBeenCalled();
  });

  it('deve adicionar email válido', () => {
    const component = fixture.componentInstance as unknown as {
      emailControl: { setValue: (value: string) => void };
      onAddEmail: () => void;
    };

    component.emailControl.setValue('user@example.com');
    component.onAddEmail();
    fixture.detectChanges();

    expect(service.addEmail).toHaveBeenCalledWith('user@example.com');
  });
});

import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { ApiResponseDTO } from '@dindinho/shared';
import { BackendStatusCardComponent } from './backend-status-card.component';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

@Component({
  standalone: true,
  imports: [BackendStatusCardComponent],
  template: ` <app-backend-status-card [apiData]="apiData()" [error]="error()" /> `,
})
class BackendStatusCardHostComponent {
  readonly apiData = signal<ApiResponseDTO | null>(null);
  readonly error = signal<string | null>(null);
}

describe('BackendStatusCardComponent', () => {
  let fixture: ComponentFixture<BackendStatusCardHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackendStatusCardHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BackendStatusCardHostComponent);
  });

  it('deve exibir estado de carregamento quando não há dados nem erro', () => {
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector(
      '[data-testid="backend-status-card"]',
    ) as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Conectando ao servidor');
  });

  it('deve exibir mensagem de erro quando error está preenchido', () => {
    fixture.componentInstance.error.set('erro');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector(
      '[data-testid="backend-status-card"]',
    ) as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Erro ao conectar');
  });

  it('deve exibir dados quando apiData está preenchido', () => {
    fixture.componentInstance.apiData.set({
      message: 'ok',
      docs: 'docs',
      endpoints: {
        health: '/health',
        test_db: '/test-db',
      },
    });
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector(
      '[data-testid="backend-status-card"]',
    ) as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('ok');
    expect(card.textContent).toContain('docs');
  });
});

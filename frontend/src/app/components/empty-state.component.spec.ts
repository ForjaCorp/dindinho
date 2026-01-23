import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { EmptyStateComponent } from './empty-state.component';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state
      testId="empty"
      icon="pi-wallet"
      title="Nenhum item"
      description="Sem resultados"
      titleTestId="empty-title"
      descriptionTestId="empty-description"
    >
      <button empty-state-actions data-testid="empty-action">Criar</button>
    </app-empty-state>
  `,
})
class EmptyStateHostComponent {}

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateHostComponent);
    fixture.detectChanges();
  });

  it('deve renderizar título, descrição e ação', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="empty"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="empty-title"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="empty-description"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="empty-action"]')).toBeTruthy();
  });

  it('deve aplicar ícone configurado', () => {
    const icon = fixture.nativeElement.querySelector('i') as HTMLElement | null;
    expect(icon).toBeTruthy();
    expect(icon?.className).toContain('pi-wallet');
  });
});

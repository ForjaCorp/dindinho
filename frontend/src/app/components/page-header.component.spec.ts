import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { PageHeaderComponent } from './page-header.component';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      title="Transações"
      subtitle="Todas as transações"
      titleTestId="page-header-title"
      subtitleTestId="page-header-subtitle"
      actionsTestId="page-header-actions"
    >
      <button page-header-actions data-testid="page-header-action-btn">Ação</button>
    </app-page-header>
  `,
})
class PageHeaderHostComponent {}

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderHostComponent);
    fixture.detectChanges();
  });

  it('deve renderizar título, subtítulo e ações', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="page-header-title"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-header-subtitle"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="page-header-actions"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-header-action-btn"]'),
    ).toBeTruthy();
  });
});

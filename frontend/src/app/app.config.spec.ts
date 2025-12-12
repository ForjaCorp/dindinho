import { describe, it, expect, beforeEach } from 'vitest';
import { ApplicationConfig } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('appConfig', () => {
  let config: ApplicationConfig;

  beforeEach(() => {
    config = appConfig;
  });

  it('should be defined', () => {
    expect(config).toBeDefined();
    expect(config.providers).toBeDefined();
    expect(Array.isArray(config.providers)).toBe(true);
  });

  it('should have the correct number of providers', () => {
    expect(config.providers).toHaveLength(4);
  });

  it('should include auth interceptor in http client configuration', () => {
    TestBed.configureTestingModule({
      providers: config.providers,
    });

    const http = TestBed.inject(HttpClient);
    expect(http).toBeTruthy();
  });

  it('should include router provider', () => {
    TestBed.configureTestingModule({
      providers: config.providers,
    });

    const router = TestBed.inject(Router);
    expect(router).toBeTruthy();
  });

  it('should include http client provider', () => {
    TestBed.configureTestingModule({
      providers: config.providers,
    });

    const http = TestBed.inject(HttpClient);
    expect(http).toBeTruthy();
  });

  it('should have routes configured', () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });
});

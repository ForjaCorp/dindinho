import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

/**
 * @description
 * Componente raiz da aplicação Dindinho. Responsável por:
 * - Definir a estrutura de layout principal
 * - Gerenciar o estado global da aplicação
 * - Fornecer o template base para todas as rotas
 * - Manter a navegação principal
 *
 * @class App
 * @implements {OnInit}
 */
@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <router-outlet></router-outlet>
  `,
})
export class App implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.handleDocsSubdomain();
  }

  /**
   * Detecta se o acesso é via subdomínio 'docs' e redireciona para a rota /docs
   * se estivermos na raiz do site.
   */
  private handleDocsSubdomain(): void {
    const hostname = window.location.hostname;
    const isDocsSubdomain = hostname.startsWith('docs.');
    const isRootPath = window.location.pathname === '/' || window.location.pathname === '';

    if (isDocsSubdomain && isRootPath) {
      this.router.navigate(['/docs']);
    }
  }
}

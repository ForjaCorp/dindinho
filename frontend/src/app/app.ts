import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  private router = inject(Router);

  /**
   * @description
   * Título da aplicação, gerenciado como um Signal para reatividade.
   * Pode ser usado para atualizações dinâmicas do título da página.
   *
   * @type {Signal<string>}
   * @default 'Dindinho'
   */
  protected readonly title = signal('Dindinho');

  /**
   * @description
   * Signal que indica se a rota atual é uma rota de autenticação (login/register).
   * Usado para ocultar elementos de navegação nessas páginas.
   */
  protected readonly isAuthRoute = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        return url.includes('/login') || url.includes('/register');
      }),
    ),
    { initialValue: false },
  );
}

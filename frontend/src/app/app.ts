import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';

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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './app.html',
})
export class App {
  /**
   * @description
   * Título da aplicação, gerenciado como um Signal para reatividade.
   * Pode ser usado para atualizações dinâmicas do título da página.
   *
   * @type {Signal<string>}
   * @default 'Dindinho'
   */
  protected readonly title = signal('Dindinho');
}

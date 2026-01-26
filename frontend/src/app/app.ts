import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
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
export class App {}

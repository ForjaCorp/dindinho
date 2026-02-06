import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from './services/auth.service';
import { CookieUtil } from './utils/cookie.util';

/**
 * @description
 * Componente raiz da aplicação Dindinho. Responsável por:
 * - Definir a estrutura de layout principal
 * - Gerenciar o estado global da aplicação
 * - Fornecer o template base para todas as rotas
 * - Manter a navegação principal
 *
 * @class App
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
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.handleTokenInUrl();
  }

  /**
   * Verifica se há um access_token no fragmento da URL (passado em localhost)
   * e o armazena nos cookies/localStorage para restaurar a sessão.
   */
  private handleTokenInUrl(): void {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');

      if (token) {
        // Armazena o token para o subdomínio atual
        CookieUtil.set('dindinho_token', token, 7);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('dindinho_token', token);
        }

        // Limpa o fragmento da URL para segurança e estética
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        // Força a restauração da sessão no AuthService
        // Como o Signal é inicializado no construtor, precisamos atualizar manualmente
        // ou deixar o refresh/navegação cuidar disso.
        // O login do AuthService faz isso, mas aqui estamos apenas restaurando.
        location.reload(); // Recarrega para garantir que o AuthService pegue o novo token
      }
    }
  }
}

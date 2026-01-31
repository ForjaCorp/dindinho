import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="flex flex-col min-h-dvh bg-slate-50 font-sans">
      <main class="flex-1 flex flex-col justify-center">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class AuthLayoutComponent {}

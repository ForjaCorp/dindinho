import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Componente reutilizável para cards de gráficos nos relatórios.
 * Encapsula estados de carregamento, estados vazios e layout consistente.
 */
@Component({
  selector: 'app-report-chart-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardModule, SkeletonModule],
  template: `
    <p-card
      [header]="title"
      [styleClass]="'h-full border border-slate-200 shadow-sm !rounded-2xl ' + styleClass"
      [attr.aria-label]="ariaLabel"
      data-testid="report-chart-card"
    >
      <div [class]="'relative ' + contentClass" data-testid="card-content">
        @if (loading) {
          <div
            class="flex flex-col gap-4 items-center justify-center h-full"
            data-testid="loading-state"
          >
            @if (loadingType === 'circle') {
              <p-skeleton shape="circle" size="200px" data-testid="loading-skeleton-circle" />
            } @else {
              <p-skeleton width="100%" height="100%" data-testid="loading-skeleton-rect" />
            }
          </div>
        } @else if (isEmpty) {
          <div
            class="flex flex-col items-center justify-center gap-3 text-slate-400 h-full"
            role="status"
            data-testid="empty-state"
          >
            <i [class]="'pi ' + emptyIcon + ' text-4xl opacity-20'" data-testid="empty-icon"></i>
            <p data-testid="empty-message">{{ emptyMessage }}</p>
          </div>
        } @else {
          <div data-testid="actual-content">
            <ng-content></ng-content>
          </div>
        }
      </div>
    </p-card>
  `,
  styles: [
    `
      :host ::ng-deep {
        .p-card {
          border-radius: 1rem;
          overflow: hidden;
        }
        .p-card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }
      }
    `,
  ],
})
export class ReportChartCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) ariaLabel!: string;
  @Input() loading = false;
  @Input() loadingType: 'circle' | 'rect' = 'rect';
  @Input() isEmpty = false;
  @Input() emptyMessage = 'Nenhum dado encontrado no período';
  @Input() emptyIcon = 'pi-inbox';
  @Input() styleClass = '';
  @Input() contentClass = 'h-[250px] md:h-[300px]';
}

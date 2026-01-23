import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'block flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200',
    '[attr.data-testid]': 'testId()',
  },
  template: `
    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
      <i [class]="'pi text-2xl text-slate-400 ' + icon()"></i>
    </div>

    <h3 class="text-lg font-semibold text-slate-700" [attr.data-testid]="titleTestId()">
      {{ title() }}
    </h3>

    @if (description()) {
      <p class="text-slate-500 max-w-md mt-2 mb-6" [attr.data-testid]="descriptionTestId()">
        {{ description() }}
      </p>
    }

    <ng-content select="[empty-state-actions]"></ng-content>
  `,
})
export class EmptyStateComponent {
  readonly testId = input<string | null>(null);

  readonly icon = input<string>('pi-inbox');

  readonly title = input.required<string>();
  readonly description = input<string | null>(null);

  readonly titleTestId = input<string | null>(null);
  readonly descriptionTestId = input<string | null>(null);
}

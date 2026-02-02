import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { AccountService } from '../services/account.service';

@Component({
  selector: 'app-account-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MultiSelectModule, FormsModule],
  template: `
    <div class="flex flex-col gap-1" data-testid="account-filter">
      <label class="sr-only" for="accountIds">Contas</label>
      <p-multiselect
        inputId="accountIds"
        [ngModel]="selectedIds()"
        (ngModelChange)="onSelectionChange($event)"
        [options]="accounts()"
        optionLabel="name"
        optionValue="id"
        placeholder="Todas as contas"
        styleClass="w-full !bg-white !border-slate-200 !rounded-xl !min-h-[40px]"
        display="chip"
        [maxSelectedLabels]="1"
        aria-label="Contas"
        [attr.data-testid]="'account-filter-multiselect'"
      />
    </div>
  `,
})
export class AccountFilterComponent {
  private accountService = inject(AccountService);
  protected readonly accounts = this.accountService.accounts;

  protected readonly selectedIds = signal<string[]>([]);

  @Input()
  set selected(value: string[]) {
    this.selectedIds.set(value || []);
  }

  @Output() selectionChange = new EventEmitter<string[]>();

  protected onSelectionChange(value: string[]) {
    this.selectedIds.set(value);
    this.selectionChange.emit(value);
  }

  constructor() {
    // Garante que as contas estejam carregadas
    this.accountService.loadAccounts();
  }
}

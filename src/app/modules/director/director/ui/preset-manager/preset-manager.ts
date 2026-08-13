import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PresetApiService } from '@app/services/preset-api.service';
import { PresetsService } from '@core/stores/presets.service';

interface PresetGroup {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

interface PresetItem {
  id: string;
  group_id: string;
  code: string;
  label: string;
  prompt: string;
  active: boolean;
}

@Component({
  selector: 'app-preset-manager',
  standalone: true,
  imports: [
    TranslatePipe, ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule,
    DialogModule, TooltipModule, SelectModule, ToastModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-[18px] font-bold uppercase tracking-[0.12em]">{{ 'DIRECT.PRESETS.TITLE' | translate }}</h1>
          <p class="mt-1 text-[12px] text-fg-muted">{{ 'DIRECT.PRESETS.SUBTITLE' | translate }}</p>
        </div>
        <div class="flex gap-2">
          <p-button [label]="'DIRECT.PRESETS.NEW_GROUP' | translate" icon="pi pi-plus" severity="secondary" (onClick)="openCreateGroup()" />
          <p-button [label]="'DIRECT.PRESETS.NEW_PRESET' | translate" icon="pi pi-plus" (onClick)="openCreatePreset()" />
        </div>
      </div>

      <div class="mb-8">
        <h2 class="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-fg-muted">{{ 'DIRECT.PRESETS.GROUPS' | translate }}</h2>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
          @for (g of groups(); track g.id) {
            <div
              class="flex min-w-0 max-w-full items-center gap-2 rounded border px-3 py-1.5 text-[12px] cursor-pointer transition-colors"
              [class.border-primary-500]="selectedGroupId() === g.id"
              [class.border-ink-700]="selectedGroupId() !== g.id"
              [class.opacity-50]="!g.active"
              (click)="selectGroup(g.id)"
            >
              <span class="min-w-0 flex-1 truncate" [title]="g.name">{{ g.name }}</span>
              <span class="shrink-0 whitespace-nowrap text-[10px] text-fg-muted">({{ g.slug }})</span>
              @if (!g.active) { <span class="shrink-0 whitespace-nowrap text-[10px] text-red-400">{{ 'DIRECT.PRESETS.INACTIVE' | translate }}</span> }
              <button type="button" class="ml-1 shrink-0 text-fg-muted hover:text-primary-400" (click)="editGroup($event, g)" [pTooltip]="'DIRECT.PRESETS.EDIT_GROUP' | translate">✎</button>
            </div>
          }
        </div>
      </div>

      @if (selectedGroupId()) {
        <div>
          <h2 class="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-fg-muted">{{ 'DIRECT.PRESETS.PRESETS_TITLE' | translate: { name: selectedGroupName() } }}</h2>
          <div class="overflow-x-auto rounded border border-ink-700">
            <table class="w-full table-fixed text-[12px]">
              <colgroup>
                <col class="w-[18%]" />
                <col class="w-[22%]" />
                <col />
                <col class="w-[10%]" />
                <col class="w-24" />
              </colgroup>
              <thead>
                <tr class="text-left text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                  <th class="px-3 py-2 font-medium">{{ 'DIRECT.PRESETS.COL_CODE' | translate }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'DIRECT.PRESETS.COL_LABEL' | translate }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'DIRECT.PRESETS.COL_PROMPT' | translate }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'DIRECT.PRESETS.COL_STATUS' | translate }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'DIRECT.PRESETS.COL_ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredPresets(); track p.id) {
                  <tr class="border-t border-ink-700 align-top" [class.opacity-50]="!p.active">
                    <td class="break-words px-3 py-2 font-mono text-[11px]">{{ p.code }}</td>
                    <td class="break-words px-3 py-2 font-semibold" [title]="p.label">{{ p.label }}</td>
                    <td class="px-3 py-2 text-fg-muted">
                      <span class="line-clamp-2 break-words" [title]="p.prompt">{{ p.prompt }}</span>
                    </td>
                    <td class="px-3 py-2">
                      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        [class.bg-green-900]="p.active" [class.text-green-400]="p.active"
                        [class.bg-red-900]="!p.active" [class.text-red-400]="!p.active"
                      >{{ p.active ? ('DIRECT.PRESETS.ACTIVE' | translate) : ('DIRECT.PRESETS.INACTIVE' | translate) }}</span>
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex gap-1">
                        <p-button icon="pi pi-pencil" severity="secondary" [text]="true" [rounded]="true" [pTooltip]="'COMMON.EDIT' | translate" (onClick)="openEditPreset(p)" />
                        <p-button [icon]="p.active ? 'pi pi-pause-circle' : 'pi pi-play-circle'"
                          severity="secondary" [text]="true" [rounded]="true"
                          [pTooltip]="p.active ? ('DIRECT.PRESETS.DEACTIVATE' | translate) : ('DIRECT.PRESETS.ACTIVATE' | translate)"
                          (onClick)="togglePresetActive(p)"
                        />
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (filteredPresets().length === 0) {
              <p class="py-6 text-center text-[12px] text-fg-muted">{{ 'DIRECT.PRESETS.NO_PRESETS' | translate }}</p>
            }
          </div>
        </div>
      }
    </section>      <p-dialog [(visible)]="groupDialogVisible" [modal]="true" [closable]="true" [draggable]="false" [style]="{ width: '32rem' }" [header]="editingGroup() ? ('DIRECT.PRESETS.EDIT_GROUP' | translate) : ('DIRECT.PRESETS.NEW_GROUP' | translate)">
      <form [formGroup]="groupForm" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">{{ 'DIRECT.PRESETS.NAME' | translate }}</label>
          <input pInputText formControlName="name" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">{{ 'DIRECT.PRESETS.SLUG' | translate }}</label>
          <input pInputText formControlName="slug" [disabled]="!!editingGroup()" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">{{ 'DIRECT.PRESETS.DESCRIPTION' | translate }}</label>
          <input pInputText formControlName="description" />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button severity="secondary" [text]="true" [label]="'COMMON.CANCEL' | translate" (onClick)="groupDialogVisible.set(false)" />
        <p-button [label]="'COMMON.SAVE' | translate" (onClick)="saveGroup()" [disabled]="groupForm.invalid" />
      </ng-template>
    </p-dialog>      <p-dialog [(visible)]="presetDialogVisible" [modal]="true" [closable]="true" [draggable]="false" [style]="{ width: '36rem' }" [header]="editingPreset() ? ('DIRECT.PRESETS.EDIT_PRESET' | translate) : ('DIRECT.PRESETS.NEW_PRESET' | translate)">
      <form [formGroup]="presetForm" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">{{ 'DIRECT.PRESETS.GROUP' | translate }}</label>
          <p-select [options]="groupOptions()" formControlName="group_id" optionLabel="name" optionValue="id" [placeholder]="'DIRECT.PRESETS.SELECT_GROUP' | translate" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">{{ 'DIRECT.PRESETS.COL_CODE' | translate }}</label>
          <input pInputText formControlName="code" [disabled]="!!editingPreset()" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">{{ 'DIRECT.PRESETS.COL_LABEL' | translate }}</label>
          <input pInputText formControlName="label" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">{{ 'DIRECT.PRESETS.COL_PROMPT' | translate }}</label>
          <textarea pTextarea rows="4" formControlName="prompt"></textarea>
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button severity="secondary" [text]="true" [label]="'COMMON.CANCEL' | translate" (onClick)="presetDialogVisible.set(false)" />
        <p-button [label]="'COMMON.SAVE' | translate" (onClick)="savePreset()" [disabled]="presetForm.invalid" />
      </ng-template>
    </p-dialog>

    <p-toast position="top-right" />
  `,
})
export class PresetManagerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PresetApiService);
  private readonly presetsSvc = inject(PresetsService);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);

  protected readonly groups = signal<PresetGroup[]>([]);
  protected readonly presets = signal<PresetItem[]>([]);
  protected readonly selectedGroupId = signal<string>('');
  protected readonly selectedGroupName = signal('');
  protected readonly filteredPresets = signal<PresetItem[]>([]);
  protected readonly groupOptions = signal<Array<{ name: string; id: string }>>([]);

  protected readonly groupDialogVisible = signal(false);
  protected readonly editingGroup = signal<PresetGroup | null>(null);
  protected readonly groupForm = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    description: [''],
  });

  protected readonly presetDialogVisible = signal(false);
  protected readonly editingPreset = signal<PresetItem | null>(null);
  protected readonly presetForm = this.fb.group({
    group_id: ['', Validators.required],
    code: ['', Validators.required],
    label: ['', Validators.required],
    prompt: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadAll();
  }

  private updateDerived(): void {
    const g = this.groups().find((x) => x.id === this.selectedGroupId());
    this.selectedGroupName.set(g?.name || '');
    this.filteredPresets.set(this.presets().filter((p) => p.group_id === this.selectedGroupId()));
    this.groupOptions.set(this.groups().map((grp) => ({ name: grp.name, id: grp.id })));
  }

  private loadAll(): void {
    this.api.getGroups(true).subscribe({
      next: (gs: any) => {
        this.groups.set(gs);
        if (!this.selectedGroupId() && gs.length > 0) {
          this.selectedGroupId.set(gs[0].id);
        }
        this.updateDerived();
      },
      error: () =>
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('DIRECT.PRESETS.TOAST_LOAD_GROUPS_FAILED'),
          life: 3000,
        }),
    });

    this.api.getPresets().subscribe({
      next: (ps: any) => {
        this.presets.set(ps);
        this.updateDerived();
      },
      error: () =>
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('DIRECT.PRESETS.TOAST_LOAD_PRESETS_FAILED'),
          life: 3000,
        }),
    });
  }

  private reloadPresetsStore(): void {
    (this.presetsSvc as any).load();
  }

  protected selectGroup(id: string): void {
    this.selectedGroupId.set(id);
    this.updateDerived();
  }

  protected openCreateGroup(): void {
    this.editingGroup.set(null);
    this.groupForm.reset({ name: '', slug: '', description: '' });
    this.groupDialogVisible.set(true);
  }

  protected editGroup(event: MouseEvent, g: PresetGroup): void {
    event.stopPropagation();
    this.editingGroup.set(g);
    this.groupForm.reset({ name: g.name, slug: g.slug, description: '' });
    this.groupDialogVisible.set(true);
  }

  protected saveGroup(): void {
    if (this.groupForm.invalid) return;
    const raw = this.groupForm.getRawValue();
    const target = this.editingGroup();

    const payload: any = {
      name: raw.name || '',
      slug: raw.slug || '',
      description: raw.description || '',
    };

    const obs = target ? this.api.updateGroup(target.id, payload) : this.api.createGroup(payload);

    obs.subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant(
            target ? 'DIRECT.PRESETS.TOAST_GROUP_UPDATED' : 'DIRECT.PRESETS.TOAST_GROUP_CREATED',
          ),
          life: 2000,
        });
        this.groupDialogVisible.set(false);
        this.loadAll();
        this.reloadPresetsStore();
      },
      error: () =>
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('DIRECT.PRESETS.TOAST_OPERATION_FAILED'),
          life: 3000,
        }),
    });
  }

  protected openCreatePreset(): void {
    this.editingPreset.set(null);
    this.presetForm.reset({ group_id: this.selectedGroupId(), code: '', label: '', prompt: '' });
    this.presetDialogVisible.set(true);
  }

  protected openEditPreset(p: PresetItem): void {
    this.editingPreset.set(p);
    this.presetForm.reset({ group_id: p.group_id, code: p.code, label: p.label, prompt: p.prompt });
    this.presetDialogVisible.set(true);
  }

  protected savePreset(): void {
    if (this.presetForm.invalid) return;
    const raw = this.presetForm.getRawValue();
    const target = this.editingPreset();

    if (target) {
      this.api.updatePreset(target.id, {
        label: raw.label || undefined,
        prompt: raw.prompt || undefined,
      }).subscribe({
        next: () => {
          this.toast.add({
            severity: 'success',
            summary: this.i18n.instant('DIRECT.PRESETS.TOAST_PRESET_UPDATED'),
            life: 2000,
          });
          this.presetDialogVisible.set(false);
          this.loadAll();
          this.reloadPresetsStore();
        },
        error: () =>
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('DIRECT.PRESETS.TOAST_FAILED'),
            life: 3000,
          }),
      });
    } else {
      this.api.createPreset({
        group_id: raw.group_id || '',
        code: raw.code || '',
        label: raw.label || '',
        prompt: raw.prompt || '',
      }).subscribe({
        next: () => {
          this.toast.add({
            severity: 'success',
            summary: this.i18n.instant('DIRECT.PRESETS.TOAST_PRESET_CREATED'),
            life: 2000,
          });
          this.presetDialogVisible.set(false);
          this.loadAll();
          this.reloadPresetsStore();
        },
        error: () =>
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('DIRECT.PRESETS.TOAST_FAILED'),
            life: 3000,
          }),
      });
    }
  }

  protected togglePresetActive(p: PresetItem): void {
    this.api.updatePreset(p.id, { active: !p.active }).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant(
            p.active ? 'DIRECT.PRESETS.TOAST_DEACTIVATED' : 'DIRECT.PRESETS.TOAST_ACTIVATED',
          ),
          life: 2000,
        });
        this.loadAll();
        this.reloadPresetsStore();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
    });
  }
}

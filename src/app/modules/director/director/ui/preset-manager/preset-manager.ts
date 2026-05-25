import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
    ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule,
    DialogModule, TooltipModule, SelectModule, ToastModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-[18px] font-bold uppercase tracking-[0.12em]">Preset Manager</h1>
          <p class="mt-1 text-[12px] text-fg-muted">Create, edit and deactivate preset groups and presets</p>
        </div>
        <div class="flex gap-2">
          <p-button label="New Group" icon="pi pi-plus" severity="secondary" (onClick)="openCreateGroup()" />
          <p-button label="New Preset" icon="pi pi-plus" (onClick)="openCreatePreset()" />
        </div>
      </div>

      <div class="mb-8">
        <h2 class="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-fg-muted">Groups</h2>
        <div class="flex flex-wrap gap-2">
          @for (g of groups(); track g.id) {
            <div
              class="flex items-center gap-2 rounded border px-3 py-1.5 text-[12px] cursor-pointer transition-colors"
              [class.border-primary-500]="selectedGroupId() === g.id"
              [class.border-ink-700]="selectedGroupId() !== g.id"
              [class.opacity-50]="!g.active"
              (click)="selectGroup(g.id)"
            >
              <span>{{ g.name }}</span>
              <span class="text-[10px] text-fg-muted">({{ g.slug }})</span>
              @if (!g.active) { <span class="text-[10px] text-red-400">inactive</span> }
              <button type="button" class="ml-1 text-fg-muted hover:text-primary-400" (click)="editGroup($event, g)" pTooltip="Edit group">✎</button>
            </div>
          }
        </div>
      </div>

      @if (selectedGroupId()) {
        <div>
          <h2 class="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-fg-muted">Presets — {{ selectedGroupName() }}</h2>
          <div class="overflow-x-auto rounded border border-ink-700">
            <table class="w-full text-[12px]">
              <thead>
                <tr class="text-left text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                  <th class="px-3 py-2 font-medium">Code</th>
                  <th class="px-3 py-2 font-medium">Label</th>
                  <th class="px-3 py-2 font-medium">Prompt</th>
                  <th class="px-3 py-2 font-medium">Status</th>
                  <th class="w-24 px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredPresets(); track p.id) {
                  <tr class="border-t border-ink-700" [class.opacity-50]="!p.active">
                    <td class="px-3 py-2 font-mono text-[11px]">{{ p.code }}</td>
                    <td class="px-3 py-2 font-semibold">{{ p.label }}</td>
                    <td class="max-w-xs truncate px-3 py-2 text-fg-muted" [title]="p.prompt">{{ p.prompt }}</td>
                    <td class="px-3 py-2">
                      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        [class.bg-green-900/40]="p.active" [class.text-green-400]="p.active"
                        [class.bg-red-900/40]="!p.active" [class.text-red-400]="!p.active"
                      >{{ p.active ? 'Active' : 'Inactive' }}</span>
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex gap-1">
                        <p-button icon="pi pi-pencil" severity="secondary" [text]="true" [rounded]="true" pTooltip="Edit" (onClick)="openEditPreset(p)" />
                        <p-button [icon]="p.active ? 'pi pi-pause-circle' : 'pi pi-play-circle'"
                          severity="secondary" [text]="true" [rounded]="true"
                          pTooltip="{{ p.active ? 'Deactivate' : 'Activate' }}"
                          (onClick)="togglePresetActive(p)"
                        />
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (filteredPresets().length === 0) {
              <p class="py-6 text-center text-[12px] text-fg-muted">No presets in this group.</p>
            }
          </div>
        </div>
      }
    </section>

    <p-dialog [(visible)]="groupDialogVisible" [modal]="true" [closable]="true" [draggable]="false" [style]="{ width: '32rem' }" header="{{ editingGroup() ? 'Edit Group' : 'New Group' }}">
      <form [formGroup]="groupForm" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">Name</label>
          <input pInputText formControlName="name" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">Slug</label>
          <input pInputText formControlName="slug" [disabled]="!!editingGroup()" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">Description</label>
          <input pInputText formControlName="description" />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button severity="secondary" [text]="true" label="Cancel" (onClick)="groupDialogVisible.set(false)" />
        <p-button label="Save" (onClick)="saveGroup()" [disabled]="groupForm.invalid" />
      </ng-template>
    </p-dialog>

    <p-dialog [(visible)]="presetDialogVisible" [modal]="true" [closable]="true" [draggable]="false" [style]="{ width: '36rem' }" header="{{ editingPreset() ? 'Edit Preset' : 'New Preset' }}">
      <form [formGroup]="presetForm" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">Group</label>
          <p-select [options]="groupOptions()" formControlName="group_id" optionLabel="name" optionValue="id" placeholder="Select group" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">Code</label>
          <input pInputText formControlName="code" [disabled]="!!editingPreset()" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">Label</label>
          <input pInputText formControlName="label" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase">Prompt</label>
          <textarea pTextarea rows="4" formControlName="prompt"></textarea>
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button severity="secondary" [text]="true" label="Cancel" (onClick)="presetDialogVisible.set(false)" />
        <p-button label="Save" (onClick)="savePreset()" [disabled]="presetForm.invalid" />
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
      error: () => this.toast.add({ severity: 'error', summary: 'Failed to load groups', life: 3000 }),
    });

    this.api.getPresets().subscribe({
      next: (ps: any) => {
        this.presets.set(ps);
        this.updateDerived();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Failed to load presets', life: 3000 }),
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
        this.toast.add({ severity: 'success', summary: target ? 'Group updated' : 'Group created', life: 2000 });
        this.groupDialogVisible.set(false);
        this.loadAll();
        this.reloadPresetsStore();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Operation failed', life: 3000 }),
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
          this.toast.add({ severity: 'success', summary: 'Preset updated', life: 2000 });
          this.presetDialogVisible.set(false);
          this.loadAll();
          this.reloadPresetsStore();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
    } else {
      this.api.createPreset({
        group_id: raw.group_id || '',
        code: raw.code || '',
        label: raw.label || '',
        prompt: raw.prompt || '',
      }).subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Preset created', life: 2000 });
          this.presetDialogVisible.set(false);
          this.loadAll();
          this.reloadPresetsStore();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
    }
  }

  protected togglePresetActive(p: PresetItem): void {
    this.api.updatePreset(p.id, { active: !p.active }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: p.active ? 'Deactivated' : 'Activated', life: 2000 });
        this.loadAll();
        this.reloadPresetsStore();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
    });
  }
}

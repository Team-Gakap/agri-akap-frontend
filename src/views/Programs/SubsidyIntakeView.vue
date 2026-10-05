<template>
  <ion-page>
    <AppHeader />
    <ion-content class="page-bg">
      <div class="shell">
        <div class="page-head">
          <div>
            <h1>Upload Regional Monthly Workbook</h1>
            <p>DA-RFO sends one workbook per month. Each tab becomes a subsidy program after you map it.</p>
          </div>
          <ion-button fill="outline" class="back-btn" @click="router.push('/admin/subsidies')">Back to programs</ion-button>
        </div>

        <section v-if="step === 'upload'" class="card">
          <label class="field">
            <span>Batch name</span>
            <input v-model="batchName" type="text" maxlength="255" placeholder="September 2026 Extraction" />
          </label>
          <label class="field">
            <span>Distribution month</span>
            <input v-model="monthYear" type="month" />
          </label>

          <div
            class="dropzone"
            :class="{ over: dragOver }"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              class="hidden-file"
              @change="onFileSelected"
            />
            <p class="drop-title">{{ selectedFile ? selectedFile.name : 'Drop the regional .xlsx here' }}</p>
            <p class="drop-hint">or choose a file. Headers such as SYSTEM_GENERATED_RSBSA_NO, LAST_NAME, and FARM_AREA are checked before anything is saved.</p>
            <ion-button class="pick-btn" @click="fileInput?.click()">Choose workbook</ion-button>
          </div>

          <ion-button expand="block" class="commit-btn" :disabled="previewing || !canPreview" @click="preview">
            <ion-spinner v-if="previewing" name="crescent" slot="start"></ion-spinner>
            {{ previewing ? 'Reading workbook…' : 'Preview sheets' }}
          </ion-button>
        </section>

        <section v-else-if="step === 'map'" class="map-stack">
          <article v-for="sheet in sheetForms" :key="sheet.index" class="card">
            <header class="sheet-head">
              <div>
                <h2>{{ sheet.sheet_name }}</h2>
                <p>{{ sheet.row_count.toLocaleString() }} data row(s)</p>
              </div>
              <div class="mode-pills">
                <button type="button" :class="{ on: sheet.mode === 'catalog' }" @click="sheet.mode = 'catalog'">Catalog</button>
                <button type="button" :class="{ on: sheet.mode === 'legacy' }" @click="sheet.mode = 'legacy'">Freeform</button>
                <button type="button" :class="{ on: sheet.mode === 'skip' }" @click="sheet.mode = 'skip'">Skip</button>
              </div>
            </header>

            <ul class="header-list">
              <li v-for="field in REQUIRED_FIELDS" :key="field.key" :class="{ missing: sheet.missing.includes(field.key) }">
                {{ field.label }}
                <span>{{ sheet.missing.includes(field.key) ? 'missing' : 'matched' }}</span>
              </li>
            </ul>
            <p v-if="sheet.mode !== 'skip' && sheet.missing.length" class="block-note">
              This sheet cannot be imported until those columns are present.
            </p>

            <div v-if="sheet.mode !== 'skip'" class="grid">
              <template v-if="sheet.mode === 'catalog'">
                <label class="field">
                  <span>Seed class</span>
                  <select v-model="sheet.seed_class" @change="onSeedClassChange(sheet)">
                    <option value="">Choose</option>
                    <option v-for="sc in SEED_CLASSES" :key="sc" :value="sc">{{ sc }}</option>
                  </select>
                </label>
                <label class="field">
                  <span>Item type</span>
                  <select v-model="sheet.item_type" :disabled="!sheet.seed_class">
                    <option value="">Choose</option>
                    <option v-for="it in itemTypesFor(sheet.seed_class)" :key="it" :value="it">{{ itemTypeLabel(it) }}</option>
                  </select>
                </label>
                <p v-if="entryFor(sheet)" class="hint">
                  Unit: {{ entryFor(sheet)?.unit }}
                  <span v-if="entryFor(sheet)?.secondaryUnit"> and {{ entryFor(sheet)?.secondaryUnit }}</span>
                </p>
              </template>
              <template v-else>
                <label class="field">
                  <span>Program name</span>
                  <input v-model="sheet.program_name" type="text" maxlength="255" />
                </label>
                <label class="field">
                  <span>Unit of measurement</span>
                  <input v-model="sheet.unit_of_measurement" type="text" maxlength="64" placeholder="bags" />
                </label>
              </template>

              <label class="field">
                <span>Target crop</span>
                <select v-model="sheet.target_crop">
                  <option value="Rice">Rice</option>
                  <option value="Corn">Corn</option>
                  <option value="Both">Rice and Corn</option>
                </select>
              </label>
              <label class="field">
                <span>Min hectares</span>
                <input v-model.number="sheet.min_hectares_limit" type="number" min="0" step="0.01" />
              </label>
              <label class="field">
                <span>Max hectares</span>
                <input v-model.number="sheet.max_hectares_limit" type="number" min="0.01" step="0.01" />
              </label>
              <label class="field">
                <span>{{ primaryUnit(sheet) }} per hectare</span>
                <input v-model.number="sheet.items_per_hectare" type="number" min="0.01" step="0.01" />
              </label>
              <label v-if="isDual(sheet)" class="field">
                <span>{{ entryFor(sheet)?.secondaryUnit }} per hectare</span>
                <input v-model.number="sheet.secondary_items_per_hectare" type="number" min="0.01" step="0.01" />
              </label>
              <label class="field">
                <span>Opening stock ({{ primaryUnit(sheet) }})</span>
                <input v-model.number="sheet.total_quantity" type="number" min="0" step="1" />
              </label>
              <label v-if="isDual(sheet)" class="field">
                <span>Opening stock ({{ entryFor(sheet)?.secondaryUnit }})</span>
                <input v-model.number="sheet.secondary_total_quantity" type="number" min="0" step="1" />
              </label>
              <label class="field">
                <span>Reorder level</span>
                <input v-model.number="sheet.reorder_level" type="number" min="0" step="1" />
              </label>
              <label v-if="isDual(sheet)" class="field">
                <span>Reorder level ({{ entryFor(sheet)?.secondaryUnit }})</span>
                <input v-model.number="sheet.secondary_reorder_level" type="number" min="0" step="1" />
              </label>
            </div>
          </article>

          <div class="actions">
            <ion-button fill="outline" class="back-btn" @click="step = 'upload'">Back</ion-button>
            <ion-button class="commit-btn" :disabled="committing || !canCommit" @click="commit">
              <ion-spinner v-if="committing" name="crescent" slot="start"></ion-spinner>
              {{ committing ? 'Importing…' : 'Commit import' }}
            </ion-button>
          </div>
        </section>

        <section v-else class="card">
          <h2>Import complete</h2>
          <table class="result-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Waitlisted</th>
                <th>Skipped</th>
                <th>Duplicates</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in results" :key="row.program_id || row.program_name">
                <td>{{ row.program_name }}</td>
                <td>{{ row.created }}</td>
                <td>{{ row.updated }}</td>
                <td>{{ row.waitlisted }}</td>
                <td>{{ row.skipped }}</td>
                <td>{{ row.duplicates_in_file }}</td>
              </tr>
            </tbody>
          </table>
          <p class="hint">Waitlisted counts are included in created and updated. Claimed rows were left unchanged.</p>
          <ion-button class="commit-btn" @click="router.push('/admin/subsidies')">Done</ion-button>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonButton, IonSpinner } from '@ionic/vue';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';
import { promptAuditRemarks } from '@/composables/promptAuditRemarks';
import {
  SEED_CLASSES, itemTypesFor, getCatalogEntry, itemTypeLabel,
  type ItemType, type SeedClass,
} from '@/constants/subsidyCatalog';

const REQUIRED_FIELDS = [
  { key: 'rsbsa_no', label: 'RSBSA no.' },
  { key: 'last_name', label: 'Last name' },
  { key: 'first_name', label: 'First name' },
  { key: 'farm_area', label: 'Farm area' },
];

interface SheetForm {
  index: number;
  sheet_name: string;
  row_count: number;
  missing: string[];
  mode: 'catalog' | 'legacy' | 'skip';
  program_name: string;
  seed_class: SeedClass | '';
  item_type: ItemType | '';
  unit_of_measurement: string;
  target_crop: string;
  max_hectares_limit: number;
  min_hectares_limit: number;
  items_per_hectare: number | null;
  secondary_items_per_hectare: number | null;
  total_quantity: number | null;
  secondary_total_quantity: number | null;
  reorder_level: number | null;
  secondary_reorder_level: number | null;
}

interface ImportResult {
  program_id?: string;
  program_name: string;
  created: number;
  updated: number;
  waitlisted: number;
  skipped: number;
  duplicates_in_file: number;
}

const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);
const dragOver = ref(false);
const previewing = ref(false);
const committing = ref(false);
const step = ref<'upload' | 'map' | 'done'>('upload');
const batchName = ref('');
const monthYear = ref('');
const selectedFile = ref<File | null>(null);
const batchId = ref('');
const sheetForms = ref<SheetForm[]>([]);
const results = ref<ImportResult[]>([]);

const canPreview = computed(() => !!selectedFile.value && batchName.value.trim() !== '' && /^\d{4}-\d{2}$/.test(monthYear.value));

const canCommit = computed(() => sheetForms.value.some((sheet) => sheet.mode !== 'skip' && sheet.missing.length === 0));

const entryFor = (sheet: SheetForm) => getCatalogEntry(sheet.seed_class, sheet.item_type);
const isDual = (sheet: SheetForm) => sheet.mode === 'catalog' && !!entryFor(sheet)?.secondaryUnit;
const primaryUnit = (sheet: SheetForm) => {
  if (sheet.mode === 'catalog') return entryFor(sheet)?.unit || 'unit';
  return sheet.unit_of_measurement || 'unit';
};

const onSeedClassChange = (sheet: SheetForm) => {
  sheet.item_type = '';
};

const takeFile = (file: File | undefined) => {
  if (!file) return;
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    toast.warning('Please select an .xlsx or .xls workbook.');
    return;
  }
  selectedFile.value = file;
};

const onDrop = (event: DragEvent) => {
  dragOver.value = false;
  takeFile(event.dataTransfer?.files?.[0]);
};

const onFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  takeFile(input.files?.[0]);
  input.value = '';
};

const preview = async () => {
  if (!selectedFile.value || !canPreview.value) return;
  previewing.value = true;
  try {
    const form = new FormData();
    form.append('workbook', selectedFile.value);
    form.append('batch_name', batchName.value.trim());
    form.append('month_year', monthYear.value);
    const res = await apiClient.post('/subsidies/import-batches', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    batchId.value = res.data?.data?.batch?.id;
    sheetForms.value = (res.data?.data?.sheets ?? []).map((sheet: any) => {
      const suggestedSeed = (sheet.suggested_seed_class || '') as SeedClass | '';
      const suggestedItem = (sheet.suggested_item_type || '') as ItemType | '';
      return {
        index: sheet.index,
        sheet_name: sheet.name,
        row_count: sheet.row_count ?? 0,
        missing: sheet.header_match?.missing ?? [],
        mode: suggestedSeed && suggestedItem ? 'catalog' : 'legacy',
        program_name: sheet.name,
        seed_class: suggestedSeed,
        item_type: suggestedItem,
        unit_of_measurement: '',
        target_crop: 'Rice',
        max_hectares_limit: 5,
        min_hectares_limit: 0,
        items_per_hectare: null,
        secondary_items_per_hectare: null,
        total_quantity: null,
        secondary_total_quantity: null,
        reorder_level: null,
        secondary_reorder_level: null,
      } satisfies SheetForm;
    });
    step.value = 'map';
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Could not read that workbook.');
  } finally {
    previewing.value = false;
  }
};

const commit = async () => {
  const active = sheetForms.value.filter((sheet) => sheet.mode !== 'skip');
  for (const sheet of active) {
    if (sheet.missing.length) {
      await toast.warning(`"${sheet.sheet_name}" is missing required columns.`);
      return;
    }
    if (sheet.mode === 'catalog' && (!sheet.seed_class || !sheet.item_type)) {
      await toast.warning(`Choose a catalog item for "${sheet.sheet_name}".`);
      return;
    }
    if (sheet.mode === 'legacy' && (!sheet.program_name.trim() || !sheet.unit_of_measurement.trim())) {
      await toast.warning(`Enter a program name and unit for "${sheet.sheet_name}".`);
      return;
    }
    if (!(Number(sheet.items_per_hectare) > 0) || !(Number(sheet.max_hectares_limit) > 0) || sheet.total_quantity === null) {
      await toast.warning(`Enter a rate, max hectares, and opening stock for "${sheet.sheet_name}".`);
      return;
    }
    if (isDual(sheet) && !(Number(sheet.secondary_items_per_hectare) > 0)) {
      await toast.warning(`Enter the second per-hectare rate for "${sheet.sheet_name}".`);
      return;
    }
  }
  if (!active.length) {
    await toast.warning('Map at least one sheet.');
    return;
  }

  const remarks = await promptAuditRemarks({
    header: 'Justify regional import',
    message: 'Explain why this monthly masterlist is being committed. Required for the audit trail.',
  });
  if (!remarks) return;

  committing.value = true;
  try {
    const res = await apiClient.post(`/subsidies/import-batches/${batchId.value}/commit`, {
      audit_remarks: remarks,
      sheets: sheetForms.value.map((sheet) => ({
        index: sheet.index,
        sheet_name: sheet.sheet_name,
        mode: sheet.mode,
        program_name: sheet.program_name,
        seed_class: sheet.mode === 'catalog' ? sheet.seed_class : null,
        item_type: sheet.mode === 'catalog' ? sheet.item_type : null,
        unit_of_measurement: sheet.mode === 'legacy' ? sheet.unit_of_measurement : null,
        target_crop: sheet.target_crop,
        max_hectares_limit: sheet.max_hectares_limit,
        min_hectares_limit: sheet.min_hectares_limit || 0,
        items_per_hectare: sheet.items_per_hectare,
        secondary_items_per_hectare: isDual(sheet) ? sheet.secondary_items_per_hectare : null,
        total_quantity: sheet.total_quantity ?? 0,
        secondary_total_quantity: isDual(sheet) ? (sheet.secondary_total_quantity ?? 0) : null,
        reorder_level: sheet.reorder_level,
        secondary_reorder_level: isDual(sheet) ? sheet.secondary_reorder_level : null,
      })),
    });
    results.value = res.data?.data?.sheets ?? [];
    step.value = 'done';
    await toast.success(res.data?.message || 'Regional masterlist imported.');
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Import failed.');
  } finally {
    committing.value = false;
  }
};
</script>

<style scoped>
.page-bg { --background: #f4f5f8; }
.shell { max-width: 980px; margin: 0 auto; padding: 0.75rem 1rem 2rem; }
.page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
.page-head h1 { margin: 0; color: #1a4731; font-size: 1.45rem; }
.page-head p, .hint, .drop-hint, .sheet-head p { color: #64748b; margin: 0.25rem 0 0; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 0.85rem; }
.field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.82rem; font-weight: 700; color: #334155; }
.field input, .field select { border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.65rem; font: inherit; font-weight: 500; color: #0f172a; background: #fff; }
.dropzone { margin-top: 0.9rem; border: 2px dashed #94a3b8; border-radius: 12px; padding: 1.4rem 1rem; text-align: center; background: #f8fafc; }
.dropzone.over { border-color: #1a4731; background: #ecfdf3; }
.drop-title { margin: 0; font-weight: 800; color: #1a4731; }
.hidden-file { display: none; }
.pick-btn, .commit-btn { --background: #1a4731; --color: #fff; text-transform: none; font-weight: 800; margin-top: 0.8rem; }
.back-btn { --color: #1a4731; --border-color: #1a4731; text-transform: none; font-weight: 700; }
.sheet-head, .actions { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; flex-wrap: wrap; }
.mode-pills { display: flex; gap: 0.35rem; }
.mode-pills button { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; padding: 0.3rem 0.7rem; font-weight: 700; cursor: pointer; }
.mode-pills button.on { background: #1a4731; color: #fff; border-color: #1a4731; }
.header-list { display: flex; flex-wrap: wrap; gap: 0.4rem; list-style: none; padding: 0.75rem 0 0; margin: 0; }
.header-list li { background: #ecfdf3; color: #166534; border-radius: 999px; padding: 0.2rem 0.6rem; font-size: 0.78rem; font-weight: 700; }
.header-list li.missing { background: #fee2e2; color: #991b1b; }
.block-note { color: #991b1b; font-weight: 700; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.7rem; margin-top: 0.8rem; }
.result-table { width: 100%; border-collapse: collapse; margin-top: 0.8rem; }
.result-table th, .result-table td { text-align: left; padding: 0.45rem 0.4rem; border-bottom: 1px solid #e2e8f0; font-size: 0.88rem; }
</style>

<template>
  <ion-page>
    <ion-header class="no-print">
      <ion-toolbar class="rpt-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Farmer Registry</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="rpt-content">
      <div class="print-only letterhead">
        <MaoFormHeader
          :show-barangay="false"
          office-title="Municipal Agriculture Office"
          title="RSBSA Farmer Masterlist"
        >
          <template #subtitle>
            <p class="lh-meta">
              Generated: {{ generatedAt }}
              <span v-if="search"> &nbsp;|&nbsp; Search: {{ search }}</span>
              <span v-if="filterBarangay"> &nbsp;|&nbsp; Barangay: {{ filterBarangay }}</span>
              <span v-if="commodity"> &nbsp;|&nbsp; Crop: {{ commodity }}</span>
              <span v-if="statusFilter"> &nbsp;|&nbsp; Status: {{ statusLabel }}</span>
            </p>
          </template>
        </MaoFormHeader>
      </div>

      <div class="print-only print-document">
        <table class="excel-table">
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th>RSBSA No.</th>
              <th>Farmer Name</th>
              <th>Barangay</th>
              <th>Contact</th>
              <th>Parcels</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!printRows.length">
              <td colspan="7" class="empty-row">No farmers match the current filters.</td>
            </tr>
            <tr v-for="(f, i) in printRows" :key="f.id">
              <td class="col-no">{{ i + 1 }}</td>
              <td class="mono">{{ f.rsbsa_no || '—' }}</td>
              <td>{{ formatName(f) }}</td>
              <td>{{ f.permanent_brgy || '—' }}</td>
              <td>{{ f.mobile_number || '—' }}</td>
              <td class="col-no">{{ f.farm_plots_count ?? 0 }}</td>
              <td>{{ farmerStatusText(f) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="rpt-shell no-print">
        <div class="filter-bar no-print">
          <div class="filter-group grow">
            <label class="filter-label">Search</label>
            <input
              class="filter-input search-input"
              type="search"
              :value="search"
              placeholder="Name or RSBSA"
              @input="onSearchInput"
            />
          </div>
          <div class="filter-group brgy-group">
            <SearchableSelect
              variant="filter"
              label="Barangay"
              placeholder="All barangays"
              empty-label="All barangays"
              allow-empty
              :options="barangayOptions"
              v-model="filterBarangay"
              @change="fetchFarmers(1)"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">Commodity</label>
            <select class="filter-select" v-model="commodity" @change="fetchFarmers(1)">
              <option value="">All crops</option>
              <option value="Rice">Rice</option>
              <option value="Corn">Corn</option>
              <option value="High-Value Crops">High-Value Crops</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select class="filter-select" v-model="statusFilter" @change="fetchFarmers(1)">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rts">RTS</option>
              <option value="duplicate">Duplicate</option>
              <option value="mismatch">Area mismatch</option>
              <option value="unmapped">Unmapped</option>
              <option value="pending_geotag">Pending geotag</option>
            </select>
          </div>
          <button class="clear-btn" @click="clearFilters">Clear</button>
        </div>

        <div class="grid-shell">
          <div class="grid-head no-print">
            <span class="grid-title">RSBSA Masterlist</span>
            <div class="grid-actions">
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                class="hidden-file"
                @change="onFileSelected"
              />
              <ion-button class="import-btn" :disabled="importing" @click="triggerImport">
                <ion-spinner v-if="importing" name="crescent" slot="start"></ion-spinner>
                <ion-icon v-else slot="start" :icon="cloudUploadOutline"></ion-icon>
                {{ importing ? 'Importing…' : 'Import RSBSA Excel' }}
              </ion-button>
              <ion-button class="enroll-btn" @click="router.push('/admin/farmers/register')">
                <ion-icon slot="start" :icon="addOutline"></ion-icon>
                Enroll
              </ion-button>
              <FormExportActions theme="admin" :print-disabled="loading || printing" @print="printReport" @excel="downloadExcel" />
              <span class="row-pill">{{ meta.total.toLocaleString() }} record(s)</span>
            </div>
          </div>

          <div v-if="loading && !farmers.length" class="grid-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading masterlist…</p>
          </div>
          <div v-else-if="error" class="grid-state error">
            <p>{{ error }}</p>
            <button class="retry-btn" @click="fetchFarmers()">Retry</button>
          </div>
          <div v-else class="table-scroll print-surface no-print">
            <table class="excel-table">
              <thead>
                <tr>
                  <th class="col-check no-print">
                    <input
                      type="checkbox"
                      class="excel-checkbox"
                      :checked="isAllSelected"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th class="col-no">No</th>
                  <th>RSBSA No.</th>
                  <th>Farmer Name</th>
                  <th>Barangay</th>
                  <th>Contact</th>
                  <th>Parcels</th>
                  <th>Status</th>
                  <th class="col-actions no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!farmers.length">
                  <td :colspan="9" class="empty-row">No farmers found. Import an RSBSA Excel file or enroll a walk-in farmer.</td>
                </tr>
                <tr
                  v-for="(f, i) in farmers"
                  :key="f.id"
                  :class="{ 'row-selected': selectedIds.has(f.id) }"
                >
                  <td class="col-check no-print">
                    <input
                      type="checkbox"
                      class="excel-checkbox"
                      :checked="selectedIds.has(f.id)"
                      @change="toggleRow(f.id)"
                    />
                  </td>
                  <td class="col-no">{{ rowNumber(i) }}</td>
                  <td class="mono">{{ f.rsbsa_no || '—' }}</td>
                  <td>{{ formatName(f) }}</td>
                  <td>{{ f.permanent_brgy || '—' }}</td>
                  <td>{{ f.mobile_number || '—' }}</td>
                  <td class="col-no">{{ f.farm_plots_count ?? 0 }}</td>
                  <td class="col-status">
                    <span v-if="f.verification_status === 'rts'" class="chip rts">RTS</span>
                    <span v-else-if="f.verification_status === 'approved'" class="chip ok">Approved</span>
                    <span v-else class="chip pending">Pending</span>
                    <span v-if="f.is_senior" class="chip gold">Senior</span>
                    <span v-if="f.is_pwd" class="chip gold">PWD</span>
                    <span v-if="f.is_probable_duplicate" class="chip dup">Duplicate</span>
                    <span v-if="f.area_mismatch" class="chip mismatch">Area mismatch</span>
                    <button
                      v-if="f.pending_geotag"
                      type="button"
                      class="chip pending-geo chip-btn"
                      @click="openDossier(f, 'parcels')"
                    >Pending geotag</button>
                    <button
                      v-else-if="!f.is_georeferenced"
                      type="button"
                      class="chip unmapped chip-btn"
                      @click="openDossier(f, 'parcels')"
                    >Unmapped</button>
                    <span v-else class="chip mapped">Mapped</span>
                  </td>
                  <td class="col-actions no-print">
                    <button class="btn-actions" :id="`act-${f.id}`" title="Actions">
                      <ion-icon :icon="ellipsisVertical"></ion-icon>
                    </button>
                    <ion-popover
                      :trigger="`act-${f.id}`"
                      trigger-action="click"
                      side="left"
                      :dismiss-on-select="true"
                    >
                      <ion-content>
                        <ion-list lines="none" class="ctx">
                          <ion-item button :detail="false" @click="openDossier(f, 'profile')">
                            <ion-icon :icon="eyeOutline" slot="start"></ion-icon>
                            <ion-label>View profile</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="openDossier(f, 'parcels')">
                            <ion-icon :icon="mapOutline" slot="start"></ion-icon>
                            <ion-label>Manage parcels</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="editFarmer(f)">
                            <ion-icon :icon="createOutline" slot="start"></ion-icon>
                            <ion-label>Edit farmer</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="openDossier(f, 'verify')">
                            <ion-icon :icon="checkmarkCircleOutline" slot="start"></ion-icon>
                            <ion-label>Verify / RTS</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="goToIdIssuance(f)">
                            <ion-icon :icon="idCardOutline" slot="start"></ion-icon>
                            <ion-label>Issue QR ID</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="promptFarmerSms(f)">
                            <ion-icon :icon="chatbubbleEllipsesOutline" slot="start"></ion-icon>
                            <ion-label>Send SMS</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" class="danger" @click="confirmArchive(f)">
                            <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                            <ion-label color="danger">Archive record</ion-label>
                          </ion-item>
                        </ion-list>
                      </ion-content>
                    </ion-popover>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pager no-print" v-if="meta.last_page > 1">
            <ion-button size="small" fill="outline" :disabled="meta.current_page <= 1 || loading" @click="fetchFarmers(meta.current_page - 1)">Previous</ion-button>
            <span>Page {{ meta.current_page }} of {{ meta.last_page }}</span>
            <ion-button size="small" fill="outline" :disabled="meta.current_page >= meta.last_page || loading" @click="fetchFarmers(meta.current_page + 1)">Next</ion-button>
          </div>
        </div>
      </div>

      <Transition name="bulk-bar">
        <div v-if="selectedIds.size" class="bulk-bar no-print">
          <strong>{{ selectedIds.size }}</strong> selected
          <button class="bulk-btn" @click="promptFilteredSms">SMS selected</button>
          <button class="bulk-btn ghost" @click="clearSelection">Clear</button>
        </div>
      </Transition>
    </ion-content>

    <ion-modal :is-open="dossierOpen" @didDismiss="closeDossier">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Farmer Profile</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeDossier">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
        <ion-toolbar>
          <ion-segment :value="dossierTab" @ionChange="(e: any) => dossierTab = e.detail.value">
            <ion-segment-button value="profile"><ion-label>Profile</ion-label></ion-segment-button>
            <ion-segment-button value="parcels"><ion-label>Parcels</ion-label></ion-segment-button>
            <ion-segment-button value="verify"><ion-label>Verification</ion-label></ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" v-if="selectedFarmer">
        <div class="dossier">
          <header class="dossier-head">
            <h2>{{ formatName(selectedFarmer) }}</h2>
            <p>{{ selectedFarmer.rsbsa_no || 'No RSBSA' }} · {{ selectedFarmer.permanent_brgy || '—' }}</p>
          </header>

          <section v-if="dossierTab === 'profile'" class="card">
            <div class="info-row"><span>Birthdate</span><strong>{{ fmtDate(selectedFarmer.birthdate) }}</strong></div>
            <div class="info-row"><span>Sex</span><strong>{{ selectedFarmer.sex || '—' }}</strong></div>
            <div class="info-row"><span>Contact</span><strong>{{ selectedFarmer.mobile_number || '—' }}</strong></div>
            <div class="info-row"><span>ID</span><strong>{{ selectedFarmer.id_type || '—' }} {{ selectedFarmer.id_number ? '· ' + selectedFarmer.id_number : '' }}</strong></div>
            <div class="info-row"><span>Priority</span>
              <strong>
                <span v-if="selectedFarmer.is_senior" class="chip gold">Senior</span>
                <span v-if="selectedFarmer.is_pwd" class="chip gold">PWD</span>
                <span v-if="!selectedFarmer.is_senior && !selectedFarmer.is_pwd">—</span>
              </strong>
            </div>
            <div class="info-row"><span>Mobile owner</span>
              <strong>
                {{ selectedFarmer.is_mobile_owner ? 'Self' : [
                  selectedFarmer.mobile_owner_first_name,
                  selectedFarmer.mobile_owner_surname,
                ].filter(Boolean).join(' ') || '—' }}
              </strong>
            </div>
            <div class="info-row"><span>Registered area</span><strong>{{ fmtHa(selectedFarmer.total_farm_area_ha) }} ha</strong></div>
            <div class="info-row"><span>Mapped area</span><strong>{{ fmtHa(selectedFarmer.mapped_area_ha) }} ha</strong></div>
            <div class="modal-actions">
              <ion-button fill="outline" @click="editFarmer(selectedFarmer)">Edit details</ion-button>
              <ion-button fill="outline" @click="goToIdIssuance(selectedFarmer)">Issue QR ID</ion-button>
            </div>
          </section>

          <section v-if="dossierTab === 'parcels'" class="card">
            <div v-if="selectedFarmer.area_mismatch" class="mismatch-banner">
              Mapped plots exceed the registered farm area. Remove duplicate legacy plots below.
            </div>
            <div class="plots-head">
              <h3>Farm plots</h3>
              <ion-button size="small" fill="outline" :disabled="loadingPlots" @click="loadFarmerPlots">
                {{ loadingPlots ? 'Loading…' : 'Refresh' }}
              </ion-button>
            </div>
            <div v-if="reviewPlots.length" class="plot-list">
              <div v-for="p in reviewPlots" :key="p.id" class="plot-row plot-card">
                <div class="plot-body">
                  <strong>{{ p.parcel_name || p.commodity || 'Plot' }}</strong>
                  <p>{{ fmtHa(p.size_ha) }} ha · {{ p.location_brgy || '—' }} · {{ p.commodity || '—' }}</p>
                  <p class="plot-meta">
                    {{ p.planting_start_month || p.cropping_schedule || 'No calendar' }}
                    · {{ plotGeoLabel(p) }}
                    <span v-if="p.geotag_assigned_name || p.assigned_technician">
                      · Assigned: {{ p.geotag_assigned_name || p.assigned_technician?.name }}
                    </span>
                    <span v-if="p.proof_of_ownership_document"> · {{ p.proof_of_ownership_document }}</span>
                  </p>
                </div>
                <div class="plot-actions">
                  <ion-button size="small" fill="outline" @click="toggleEditPlot(p)">
                    {{ editingPlotId === p.id ? 'Close' : 'Edit' }}
                  </ion-button>
                  <ion-button
                    v-if="!plotIsMapped(p)"
                    size="small"
                    fill="outline"
                    color="tertiary"
                    @click="toggleMapPlot(p)"
                  >
                    {{ mappingPlotId === p.id ? 'Close' : (p.geotag_status === 'pending_field' ? 'Dispatch' : 'Geo-tag') }}
                  </ion-button>
                  <ion-button size="small" color="danger" fill="outline" :disabled="deletingPlotId === p.id" @click="confirmDeletePlot(p)">
                    {{ deletingPlotId === p.id ? 'Removing…' : 'Remove' }}
                  </ion-button>
                </div>

                <form v-if="editingPlotId === p.id" class="plot-form" @submit.prevent="savePlotEdit(p)">
                  <label>Parcel name
                    <input class="plot-input" v-model="editForm.parcel_name" />
                  </label>
                  <label>Barangay
                    <input class="plot-input" v-model="editForm.location_brgy" />
                  </label>
                  <label>Commodity
                    <select class="plot-input" v-model="editForm.commodity">
                      <option v-if="editForm.commodity && !(commodityOptions as readonly string[]).includes(editForm.commodity)" :value="editForm.commodity">{{ editForm.commodity }}</option>
                      <option v-for="c in commodityOptions" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </label>
                  <label>Size (ha)
                    <input class="plot-input" type="number" step="0.0001" min="0.0001" v-model="editForm.size_ha" />
                  </label>
                  <label>Ownership
                    <select class="plot-input" v-model="editForm.ownership_type">
                      <option value="Registered Owner">Registered Owner</option>
                      <option value="Tenant">Tenant</option>
                      <option value="Lessee">Lessee</option>
                      <option value="Others">Others</option>
                    </select>
                  </label>
                  <label>Latitude
                    <input class="plot-input" type="number" step="0.00000001" v-model="editForm.latitude" />
                  </label>
                  <label>Longitude
                    <input class="plot-input" type="number" step="0.00000001" v-model="editForm.longitude" />
                  </label>
                  <label>GEOREF ID
                    <input class="plot-input" v-model="editForm.georef_id" />
                  </label>
                  <label class="span-2">Remarks
                    <input class="plot-input" v-model="editForm.remarks" />
                  </label>
                  <div class="span-2 form-btns">
                    <ion-button type="submit" size="small" :disabled="savingPlotId === p.id">
                      {{ savingPlotId === p.id ? 'Saving…' : 'Save parcel' }}
                    </ion-button>
                  </div>
                </form>

                <div v-if="mappingPlotId === p.id" class="plot-form map-form">
                  <p class="form-legend">Assign a technician for a field walk, or encode coordinates here.</p>
                  <label>Technician
                    <select class="plot-input" v-model="mapForm.assignee">
                      <option value="">Select agricultural technician</option>
                      <option v-for="t in technicians" :key="t.id" :value="t.id">{{ t.name }}</option>
                      <option value="others">Others (JO / surveyor)</option>
                    </select>
                  </label>
                  <label v-if="mapForm.assignee === 'others'">Name
                    <input class="plot-input" v-model="mapForm.othersName" placeholder="Surveyor or JO name" />
                  </label>
                  <label>Priority
                    <select class="plot-input" v-model="mapForm.priority">
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                  <label>Deadline
                    <input class="plot-input" type="date" v-model="mapForm.deadline" />
                  </label>
                  <label class="span-2">Notes
                    <input class="plot-input" v-model="mapForm.notes" placeholder="Access notes, landmarks…" />
                  </label>
                  <div class="span-2 form-btns">
                    <ion-button size="small" :disabled="savingPlotId === p.id" @click="assignGeotag(p)">
                      {{ savingPlotId === p.id ? 'Saving…' : 'Assign for field geotag' }}
                    </ion-button>
                  </div>

                  <p class="form-legend">Desktop coordinates / GPX</p>
                  <label>Latitude
                    <input class="plot-input" type="number" step="0.00000001" v-model="mapForm.latitude" />
                  </label>
                  <label>Longitude
                    <input class="plot-input" type="number" step="0.00000001" v-model="mapForm.longitude" />
                  </label>
                  <label class="span-2">GEOREF ID
                    <input class="plot-input" v-model="mapForm.georef_id" placeholder="e.g. GPX-ECH-0001" />
                  </label>
                  <label class="span-2">GPX file
                    <input class="plot-input" type="file" accept=".gpx,application/gpx+xml,text/xml" @change="onGpxSelected" />
                    <span v-if="mapForm.gpxFileName" class="gpx-hint">{{ mapForm.gpxFileName }} · {{ mapForm.boundary_points?.length || 0 }} points</span>
                  </label>
                  <div class="span-2 form-btns">
                    <ion-button size="small" fill="outline" :disabled="savingPlotId === p.id" @click="encodeCoordinates(p)">
                      {{ savingPlotId === p.id ? 'Saving…' : 'Save coordinates' }}
                    </ion-button>
                  </div>
                </div>
              </div>
            </div>
            <p v-else-if="plotsLoaded" class="plots-empty">No active farm plots.</p>
          </section>

          <section v-if="dossierTab === 'verify'" class="card">
            <div class="info-row"><span>Status</span>
              <strong :class="'st-' + (selectedFarmer.verification_status || 'pending')">
                {{ (selectedFarmer.verification_status || 'pending').toUpperCase() }}
              </strong>
            </div>
            <div class="info-row"><span>ID presented</span><strong>{{ selectedFarmer.id_type || '—' }} {{ selectedFarmer.id_number || '' }}</strong></div>
            <div v-if="selectedFarmer.rts_reason" class="rts-reason-box">
              <strong>RTS reason</strong>
              <p>{{ selectedFarmer.rts_reason }}</p>
            </div>
            <div class="modal-actions stacked">
              <ion-button expand="block" color="success" :disabled="processingVerify" @click="verifyFarmer">
                {{ processingVerify ? 'Saving…' : 'Mark verified' }}
              </ion-button>
              <ion-button expand="block" color="warning" :disabled="processingRts" @click="promptRtsReason">
                {{ processingRts ? 'Processing…' : 'Return for correction (RTS)' }}
              </ion-button>
            </div>
          </section>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonModal, IonPopover, IonList, IonItem, IonLabel,
  IonSegment, IonSegmentButton, alertController,
} from '@ionic/vue';
import {
  addOutline, cloudUploadOutline, ellipsisVertical, eyeOutline, mapOutline,
  createOutline, checkmarkCircleOutline, idCardOutline, chatbubbleEllipsesOutline,
  trashOutline,
} from 'ionicons/icons';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';
import SearchableSelect from '@/components/SearchableSelect.vue';
import FormExportActions from '@/components/FormExportActions.vue';
import MaoFormHeader from '@/components/MaoFormHeader.vue';
import { useOfficialBarangays } from '@/composables/useOfficialBarangays';
import { exportAdminGridExcel } from '@/utils/statutoryFormExcel';
import { parseGpxPoints } from '@/utils/parseGpx';
import { COMMODITY_OPTIONS } from '@/data/echagueBarangays';

const router = useRouter();
const route = useRoute();
const { barangays: barangayOptions } = useOfficialBarangays();

const fileInput = ref<HTMLInputElement | null>(null);
const farmers = ref<any[]>([]);
const loading = ref(false);
const importing = ref(false);
const error = ref('');
const search = ref('');
const commodity = ref('');
const filterBarangay = ref('');
const statusFilter = ref('');
const meta = ref({ current_page: 1, last_page: 1, total: 0 });
const selectedIds = ref(new Set<string>());

const dossierOpen = ref(false);
const dossierTab = ref<'profile' | 'parcels' | 'verify'>('profile');
const selectedFarmer = ref<any | null>(null);
const processingRts = ref(false);
const processingVerify = ref(false);
const reviewPlots = ref<any[]>([]);
const loadingPlots = ref(false);
const plotsLoaded = ref(false);
const deletingPlotId = ref<string | null>(null);
const editingPlotId = ref<string | null>(null);
const mappingPlotId = ref<string | null>(null);
const savingPlotId = ref<string | null>(null);
const printing = ref(false);
const printRows = ref<any[]>([]);
const technicians = ref<{ id: string; name: string }[]>([]);
const commodityOptions = COMMODITY_OPTIONS;
const editForm = ref({
  parcel_name: '',
  location_brgy: '',
  commodity: 'Rice',
  size_ha: '',
  ownership_type: 'Registered Owner',
  latitude: '',
  longitude: '',
  georef_id: '',
  remarks: '',
});
const mapForm = ref({
  assignee: '',
  othersName: '',
  priority: 'routine',
  deadline: '',
  notes: '',
  latitude: '',
  longitude: '',
  georef_id: '',
  gpxFileName: '',
  boundary_points: null as { lat: number; lng: number }[] | null,
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;

const generatedAt = computed(() =>
  new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
);
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: 'Pending', approved: 'Approved', rts: 'RTS', duplicate: 'Duplicate', mismatch: 'Area mismatch',
    unmapped: 'Unmapped', pending_geotag: 'Pending geotag',
  };
  return map[statusFilter.value] || '';
});
const isAllSelected = computed(() => farmers.value.length > 0 && farmers.value.every((f) => selectedIds.value.has(f.id)));

const formatName = (f: any) => {
  if (!f?.surname) return '—';
  return `${f.surname}, ${[f.first_name, f.middle_name, f.ext_name].filter(Boolean).join(' ')}`;
};
const fmtHa = (v: unknown) => Number(v ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });
const fmtDate = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return d;
  }
};
const filled = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
const rowNumber = (idx: number) => (meta.value.current_page - 1) * 15 + idx + 1;

const listParams = () => {
  const params: Record<string, unknown> = {
    search: search.value || undefined,
    barangay: filterBarangay.value || undefined,
    commodity: commodity.value || undefined,
  };
  if (['pending', 'approved', 'rts'].includes(statusFilter.value)) {
    params.verification_status = statusFilter.value;
  }
  if (statusFilter.value === 'duplicate') params.duplicate = 1;
  if (statusFilter.value === 'mismatch') params.area_mismatch = 1;
  if (statusFilter.value === 'unmapped') params.georeferenced = 0;
  if (statusFilter.value === 'pending_geotag') params.pending_geotag = 1;
  return params;
};

const fetchFarmers = async (page = 1) => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/farmers', {
      params: { ...listParams(), page, per_page: 15 },
    });
    const payload = res.data?.data;
    farmers.value = payload?.data ?? [];
    meta.value = {
      current_page: payload?.current_page ?? 1,
      last_page: payload?.last_page ?? 1,
      total: payload?.total ?? farmers.value.length,
    };
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load farmer registry.';
  } finally {
    loading.value = false;
  }
};

const onSearchInput = (e: Event) => {
  search.value = (e.target as HTMLInputElement).value.trim();
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchFarmers(1), 400);
};

const clearFilters = () => {
  search.value = '';
  commodity.value = '';
  filterBarangay.value = '';
  statusFilter.value = '';
  fetchFarmers(1);
};

const toggleRow = (id: string) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
    return;
  }
  selectedIds.value = new Set(farmers.value.map((f) => f.id));
};
const clearSelection = () => {
  selectedIds.value = new Set();
};

const triggerImport = () => fileInput.value?.click();
const onFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    await toast.warning('Please select an .xlsx, .xls, or .csv file.');
    return;
  }
  importing.value = true;
  try {
    const form = new FormData();
    form.append('excel_file', file);
    const res = await apiClient.post('/farmers/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const stats = res.data?.data ?? {};
    await toast.success(`Import complete — ${stats.created ?? 0} created, ${stats.updated ?? 0} updated, ${stats.skipped ?? 0} skipped.`);
    await fetchFarmers(1);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Import failed. Check the file and try again.');
  } finally {
    importing.value = false;
  }
};

const farmerStatusText = (f: any) => {
  const parts = [String(f.verification_status || 'pending')];
  if (f.is_senior) parts.push('Senior');
  if (f.is_pwd) parts.push('PWD');
  if (f.is_probable_duplicate) parts.push('Duplicate');
  if (f.area_mismatch) parts.push('Area mismatch');
  if (f.pending_geotag) parts.push('Pending geotag');
  else parts.push(f.is_georeferenced ? 'Mapped' : 'Unmapped');
  return parts.join(', ');
};

const plotIsMapped = (p: any) => {
  if (p.geotag_status === 'mapped' || !!filled(p.georef_id) || !!(p.boundary_points && p.boundary_points.length)) {
    return true;
  }
  const lat = p.latitude == null || p.latitude === '' ? null : Number(p.latitude);
  const lng = p.longitude == null || p.longitude === '' ? null : Number(p.longitude);
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001);
};

const plotGeoLabel = (p: any) => {
  if (plotIsMapped(p)) return 'Mapped';
  if (p.geotag_status === 'pending_field') return 'Pending field geotag';
  return 'Unmapped';
};

const printReport = async () => {
  printing.value = true;
  try {
    printRows.value = await collectExportRows();
    await nextTick();
    window.print();
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Could not load filtered rows for print.');
  } finally {
    printing.value = false;
  }
};

const collectExportRows = async () => {
  const rows: any[] = [];
  let page = 1;
  let last = 1;
  do {
    const res = await apiClient.get('/farmers', {
      params: { ...listParams(), page, per_page: 50 },
    });
    const payload = res.data?.data;
    rows.push(...(payload?.data ?? []));
    last = payload?.last_page ?? 1;
    page += 1;
  } while (page <= last && page <= 40);
  return rows;
};

const downloadExcel = async () => {
  try {
    const rows = await collectExportRows();
    await exportAdminGridExcel({
      filename: 'rsbsa-farmer-masterlist.xlsx',
      reportTitle: 'RSBSA Farmer Masterlist',
      metaLine: `Generated: ${generatedAt.value}${filterBarangay.value ? ' | Barangay: ' + filterBarangay.value : ''}${commodity.value ? ' | Crop: ' + commodity.value : ''}`,
      columns: [
        { key: 'no', label: 'No' },
        { key: 'rsbsa_no', label: 'RSBSA No.' },
        { key: 'farmer_name', label: 'Farmer Name' },
        { key: 'barangay', label: 'Barangay' },
        { key: 'contact', label: 'Contact' },
        { key: 'parcels', label: 'Parcels' },
        { key: 'status', label: 'Status' },
      ],
      rows,
      getCellValue(row, key, index) {
        if (key === 'no') return index + 1;
        if (key === 'farmer_name') return formatName(row);
        if (key === 'barangay') return String(row.permanent_brgy ?? '');
        if (key === 'contact') return String(row.mobile_number ?? '');
        if (key === 'parcels') return Number(row.farm_plots_count ?? 0);
        if (key === 'status') return farmerStatusText(row);
        return String(row[key] ?? '');
      },
    });
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Excel export failed.');
  }
};

const openDossier = async (farmer: any, tab: 'profile' | 'parcels' | 'verify' = 'profile') => {
  selectedFarmer.value = farmer;
  dossierTab.value = tab;
  reviewPlots.value = [];
  plotsLoaded.value = false;
  dossierOpen.value = true;
  try {
    const res = await apiClient.get(`/farmers/${farmer.id}`);
    if (res.data?.data) selectedFarmer.value = { ...farmer, ...res.data.data };
  } catch { /* keep list row */ }
  if (tab === 'parcels' || selectedFarmer.value?.area_mismatch) {
    await Promise.all([loadFarmerPlots(), loadTechnicians()]);
  }
};

watch(dossierTab, (tab) => {
  if (tab === 'parcels' && selectedFarmer.value && !plotsLoaded.value) {
    void loadFarmerPlots();
    void loadTechnicians();
  }
});

const closeDossier = () => {
  dossierOpen.value = false;
  selectedFarmer.value = null;
  reviewPlots.value = [];
  plotsLoaded.value = false;
  editingPlotId.value = null;
  mappingPlotId.value = null;
};

const loadTechnicians = async () => {
  try {
    const res = await apiClient.get('/users', { params: { role: 'technician' } });
    technicians.value = res.data?.data ?? [];
  } catch {
    technicians.value = [];
  }
};

const loadFarmerPlots = async () => {
  if (!selectedFarmer.value?.id) return;
  loadingPlots.value = true;
  try {
    const res = await apiClient.get('/farm-plots', { params: { farmer_id: selectedFarmer.value.id } });
    reviewPlots.value = res.data?.data ?? [];
    plotsLoaded.value = true;
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Could not load farm plots.');
  } finally {
    loadingPlots.value = false;
  }
};

const confirmDeletePlot = async (plot: any) => {
  const alert = await alertController.create({
    header: 'Remove farm plot?',
    message: `Soft-delete ${plot.commodity || 'plot'} (${fmtHa(plot.size_ha)} ha)?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Remove', role: 'destructive', handler: () => { void deletePlot(plot.id); } },
    ],
  });
  await alert.present();
};

const deletePlot = async (plotId: string) => {
  deletingPlotId.value = plotId;
  try {
    await apiClient.delete(`/farm-plots/${plotId}`);
    reviewPlots.value = reviewPlots.value.filter((p) => p.id !== plotId);
    await toast.success('Farm plot removed.');
    if (selectedFarmer.value?.id) {
      const res = await apiClient.get(`/farmers/${selectedFarmer.value.id}`);
      if (res.data?.data) {
        selectedFarmer.value = { ...selectedFarmer.value, ...res.data.data };
        const idx = farmers.value.findIndex((f) => f.id === selectedFarmer.value?.id);
        if (idx !== -1) {
          farmers.value[idx] = {
            ...farmers.value[idx],
            area_mismatch: selectedFarmer.value.area_mismatch,
            mapped_area_ha: selectedFarmer.value.mapped_area_ha,
            farm_plots_count: reviewPlots.value.length,
          };
        }
      }
    }
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Failed to remove plot.');
  } finally {
    deletingPlotId.value = null;
  }
};

const toggleEditPlot = (plot: any) => {
  mappingPlotId.value = null;
  if (editingPlotId.value === plot.id) {
    editingPlotId.value = null;
    return;
  }
  editingPlotId.value = plot.id;
  editForm.value = {
    parcel_name: plot.parcel_name || '',
    location_brgy: plot.location_brgy || '',
    commodity: plot.commodity || 'Rice',
    size_ha: String(plot.size_ha ?? ''),
    ownership_type: plot.ownership_type || 'Registered Owner',
    latitude: plot.latitude != null ? String(plot.latitude) : '',
    longitude: plot.longitude != null ? String(plot.longitude) : '',
    georef_id: plot.georef_id || '',
    remarks: plot.remarks || '',
  };
};

const toggleMapPlot = (plot: any) => {
  editingPlotId.value = null;
  if (mappingPlotId.value === plot.id) {
    mappingPlotId.value = null;
    return;
  }
  mappingPlotId.value = plot.id;
  mapForm.value = {
    assignee: plot.geotag_assigned_user_id || (plot.geotag_assigned_name ? 'others' : ''),
    othersName: plot.geotag_assigned_name || '',
    priority: plot.geotag_priority || 'routine',
    deadline: plot.geotag_deadline ? String(plot.geotag_deadline).slice(0, 10) : '',
    notes: plot.geotag_notes || '',
    latitude: plot.latitude != null ? String(plot.latitude) : '',
    longitude: plot.longitude != null ? String(plot.longitude) : '',
    georef_id: plot.georef_id || '',
    gpxFileName: '',
    boundary_points: null,
  };
};

const patchPlot = async (plotId: string, payload: Record<string, unknown>) => {
  savingPlotId.value = plotId;
  try {
    const res = await apiClient.patch(`/farm-plots/${plotId}`, payload);
    const updated = res.data?.data;
    if (updated) {
      reviewPlots.value = reviewPlots.value.map((p) => (p.id === plotId ? { ...p, ...updated } : p));
    }
    await refreshFarmerRow();
    return true;
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Could not save farm plot.');
    return false;
  } finally {
    savingPlotId.value = null;
  }
};

const savePlotEdit = async (plot: any) => {
  const ok = await patchPlot(plot.id, {
    parcel_name: editForm.value.parcel_name || null,
    location_brgy: editForm.value.location_brgy,
    commodity: editForm.value.commodity,
    size_ha: Number(editForm.value.size_ha),
    ownership_type: editForm.value.ownership_type,
    latitude: editForm.value.latitude === '' ? null : Number(editForm.value.latitude),
    longitude: editForm.value.longitude === '' ? null : Number(editForm.value.longitude),
    georef_id: editForm.value.georef_id || null,
    remarks: editForm.value.remarks || null,
  });
  if (ok) {
    editingPlotId.value = null;
    await toast.success('Parcel updated.');
  }
};

const assignGeotag = async (plot: any) => {
  if (!mapForm.value.assignee) {
    await toast.warning('Select a technician or Others.');
    return;
  }
  if (mapForm.value.assignee === 'others' && !mapForm.value.othersName.trim()) {
    await toast.warning('Enter the name of the surveyor or job-order staff.');
    return;
  }
  const tech = technicians.value.find((t) => t.id === mapForm.value.assignee);
  const ok = await patchPlot(plot.id, {
    geotag_status: 'pending_field',
    geotag_assigned_user_id: mapForm.value.assignee === 'others' ? null : mapForm.value.assignee,
    geotag_assigned_name: mapForm.value.assignee === 'others'
      ? mapForm.value.othersName.trim()
      : (tech?.name || null),
    geotag_priority: mapForm.value.priority,
    geotag_deadline: mapForm.value.deadline || null,
    geotag_notes: mapForm.value.notes || null,
  });
  if (ok) {
    mappingPlotId.value = null;
    await toast.success('Parcel assigned for field geo-tagging.');
  }
};

const onGpxSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    mapForm.value.gpxFileName = '';
    mapForm.value.boundary_points = null;
    return;
  }
  try {
    const xml = await file.text();
    const points = parseGpxPoints(xml);
    if (points.length < 1) {
      await toast.warning('No GPS points found in that GPX file.');
      mapForm.value.boundary_points = null;
      mapForm.value.gpxFileName = '';
      return;
    }
    mapForm.value.boundary_points = points;
    mapForm.value.gpxFileName = file.name;
    mapForm.value.latitude = String(points[0].lat);
    mapForm.value.longitude = String(points[0].lng);
  } catch {
    await toast.error('Could not read the GPX file.');
  }
};

const encodeCoordinates = async (plot: any) => {
  const points = mapForm.value.boundary_points;
  const lat = mapForm.value.latitude === '' ? null : Number(mapForm.value.latitude);
  const lng = mapForm.value.longitude === '' ? null : Number(mapForm.value.longitude);
  if (!mapForm.value.georef_id.trim() && !points && (lat == null || lng == null)) {
    await toast.warning('Enter latitude/longitude, a GEOREF ID, or attach a GPX file.');
    return;
  }
  const payload: Record<string, unknown> = {
    geotag_status: 'mapped',
    georef_id: mapForm.value.georef_id.trim() || null,
    latitude: lat,
    longitude: lng,
  };
  if (points && points.length >= 3) payload.boundary_points = points;
  const ok = await patchPlot(plot.id, payload);
  if (ok) {
    mappingPlotId.value = null;
    await toast.success('Parcel mapped from desktop coordinates.');
  }
};

const refreshFarmerRow = async () => {
  if (!selectedFarmer.value?.id) return;
  try {
    const res = await apiClient.get(`/farmers/${selectedFarmer.value.id}`);
    if (res.data?.data) {
      selectedFarmer.value = { ...selectedFarmer.value, ...res.data.data };
      const idx = farmers.value.findIndex((f) => f.id === selectedFarmer.value?.id);
      if (idx !== -1) {
        farmers.value[idx] = {
          ...farmers.value[idx],
          area_mismatch: selectedFarmer.value.area_mismatch,
          mapped_area_ha: selectedFarmer.value.mapped_area_ha,
          is_georeferenced: selectedFarmer.value.is_georeferenced,
          pending_geotag: selectedFarmer.value.pending_geotag,
          farm_plots_count: reviewPlots.value.length,
        };
      }
    }
  } catch { /* keep current row */ }
};

const editFarmer = (farmer: any) => {
  closeDossier();
  router.push({ path: '/admin/farmers/register', query: { id: farmer.id } });
};
const goToIdIssuance = (farmer: any) => {
  closeDossier();
  router.push({ path: '/admin/id-issuance', query: { farmer_id: farmer.id } });
};

const verifyFarmer = async () => {
  if (!selectedFarmer.value) return;
  processingVerify.value = true;
  try {
    await apiClient.post(`/farmers/${selectedFarmer.value.id}/verify`);
    selectedFarmer.value.verification_status = 'approved';
    const idx = farmers.value.findIndex((f) => f.id === selectedFarmer.value?.id);
    if (idx !== -1) farmers.value[idx].verification_status = 'approved';
    await toast.success('Farmer marked as verified.');
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Could not verify farmer.');
  } finally {
    processingVerify.value = false;
  }
};

const promptRtsReason = async () => {
  const alert = await alertController.create({
    header: 'Return for Correction',
    message: 'Select the reason for returning this document:',
    inputs: [
      { type: 'radio', label: 'Blurry ID', value: 'Blurry ID', checked: true },
      { type: 'radio', label: 'Missing Signatures', value: 'Missing Signatures' },
      { type: 'radio', label: 'Incomplete Information', value: 'Incomplete Information' },
      { type: 'radio', label: 'Photo Quality Issue', value: 'Photo Quality Issue' },
      { type: 'radio', label: 'Invalid Document', value: 'Invalid Document' },
      { type: 'radio', label: 'Other', value: 'Other' },
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Submit', role: 'confirm', handler: (reason) => { if (reason) returnForCorrection(reason); } },
    ],
  });
  await alert.present();
};

const returnForCorrection = async (reason: string) => {
  if (!selectedFarmer.value) return;
  processingRts.value = true;
  try {
    await apiClient.post(`/farmers/${selectedFarmer.value.id}/return-for-correction`, { reason });
    selectedFarmer.value.verification_status = 'rts';
    selectedFarmer.value.rts_reason = reason;
    const idx = farmers.value.findIndex((f) => f.id === selectedFarmer.value?.id);
    if (idx !== -1) farmers.value[idx].verification_status = 'rts';
    await toast.success('Farmer marked for correction. SMS notification sent.');
    closeDossier();
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Failed to process RTS.');
  } finally {
    processingRts.value = false;
  }
};

const promptFarmerSms = async (farmer: any) => {
  if (!farmer.mobile_number) {
    await toast.warning('This farmer has no mobile number.');
    return;
  }
  const alert = await alertController.create({
    header: 'Send SMS',
    message: `To ${formatName(farmer)} (${farmer.mobile_number})`,
    inputs: [{ name: 'message', type: 'textarea', placeholder: 'Message (max 160 characters)', attributes: { maxlength: 160 } }],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Send',
        handler: (data) => {
          const message = String(data?.message || '').trim();
          if (!message) return false;
          void sendFarmerSms(farmer.id, message);
        },
      },
    ],
  });
  await alert.present();
};

const sendFarmerSms = async (id: string, message: string) => {
  try {
    await apiClient.post(`/farmers/${id}/notify`, { message });
    await toast.success('SMS queued.');
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'SMS failed.');
  }
};

const promptFilteredSms = async () => {
  const ids = selectedIds.value.size ? Array.from(selectedIds.value) : farmers.value.map((f) => f.id);
  if (!ids.length) {
    await toast.warning('No farmers in the current view.');
    return;
  }
  const alert = await alertController.create({
    header: selectedIds.value.size ? 'SMS selected farmers' : 'SMS current page',
    inputs: [{ name: 'message', type: 'textarea', placeholder: 'Message (max 160 characters)', attributes: { maxlength: 160 } }],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Send',
        handler: (data) => {
          const message = String(data?.message || '').trim();
          if (!message) return false;
          void sendBulkSms(ids, message);
        },
      },
    ],
  });
  await alert.present();
};

const sendBulkSms = async (farmerIds: string[], message: string) => {
  try {
    await apiClient.post('/broadcasts/send', {
      message_body: message,
      farmer_ids: farmerIds,
    });
    await toast.success('SMS broadcast queued.');
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Broadcast failed.');
  }
};

const confirmArchive = async (farmer: any) => {
  const alert = await alertController.create({
    header: 'Archive farmer?',
    message: `${formatName(farmer)} will be soft-deleted from the active registry.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Archive',
        role: 'destructive',
        handler: () => { void archiveFarmer(farmer.id); },
      },
    ],
  });
  await alert.present();
};

const archiveFarmer = async (id: string) => {
  try {
    await apiClient.delete(`/farmers/${id}`);
    farmers.value = farmers.value.filter((f) => f.id !== id);
    const next = new Set(selectedIds.value);
    next.delete(id);
    selectedIds.value = next;
    await toast.success('Farmer archived.');
    if (selectedFarmer.value?.id === id) closeDossier();
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Could not archive farmer.');
  }
};

onMounted(() => {
  const initialSearch = String(route.query.search ?? '').trim();
  if (initialSearch) search.value = initialSearch;
  fetchFarmers();
});
</script>

<style scoped>
.rpt-toolbar { --background: #1a4731; --color: #fff; }
.rpt-content { --background: #eef2f0; }
.rpt-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem 1rem 1rem;
  gap: 0.65rem;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: flex-end;
  background: #fff;
  border: 1px solid #d5dbe1;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
}
.filter-group { display: flex; flex-direction: column; gap: 3px; }
.filter-group.grow { flex: 1; min-width: 220px; }
.brgy-group { min-width: 220px; max-width: 280px; }
.filter-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.filter-select, .filter-input {
  font-size: 0.82rem;
  border: 1.5px solid #94a3b8;
  border-radius: 6px;
  padding: 5px 8px;
  background: #fff;
  color: #0f172a;
  font-family: inherit;
}
.filter-select:focus, .filter-input:focus {
  outline: none;
  border-color: #1a4731;
  box-shadow: 0 0 0 2px rgba(26, 71, 49, 0.14);
}
.filter-select { min-width: 150px; }
.search-input { width: 100%; min-width: 180px; }
.clear-btn {
  align-self: flex-end;
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
}
.clear-btn:hover { border-color: #94a3b8; color: #334155; }

.grid-shell {
  flex: 1;
  min-height: 0;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.grid-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.55rem 1rem;
  background: linear-gradient(90deg, #1a4731 0%, #245a3f 100%);
}
.grid-title { color: #d1e0d6; font-size: 0.9rem; font-weight: 700; }
.grid-actions { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; }
.row-pill {
  background: #d4af37;
  color: #1a4731;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 999px;
}
.hidden-file { display: none; }
.import-btn { --background: #d4af37; --color: #1a4731; font-weight: 800; text-transform: none; }
.enroll-btn { --background: #fff; --color: #1a4731; font-weight: 800; text-transform: none; }
.sms-btn { --color: #fff; --border-color: #d4af37; font-weight: 700; text-transform: none; }

.grid-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #64748b;
  padding: 2rem;
}
.grid-state.error { color: #b91c1c; }
.retry-btn {
  border: 1px solid #1a4731;
  background: transparent;
  color: #1a4731;
  border-radius: 6px;
  padding: 4px 14px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.8rem;
}

.table-scroll { flex: 1; overflow: auto; }
.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  color: #1e293b;
  min-width: 980px;
}
.excel-table th, .excel-table td {
  border: 1px solid #cbd5e1;
  padding: 4px 8px;
  text-align: left;
}
.excel-table thead th {
  position: sticky;
  top: 0;
  background: #1a4731;
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  z-index: 2;
  white-space: nowrap;
}
.excel-table tbody tr:nth-child(even) { background: #f8fafc; }
.excel-table tbody tr:hover { background: #eef5ee; }
.excel-table tbody tr.row-selected td { background: #edf5ff; }
.col-no { text-align: right; width: 44px; }
.col-check { width: 36px; text-align: center; }
.col-actions { width: 52px; text-align: center; position: sticky; right: 0; background: inherit; }
.excel-table thead th.col-actions { background: #1a4731; }
.col-status { white-space: normal; min-width: 180px; }
.mono { font-family: 'Courier New', monospace; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem 0; font-style: italic; }
.excel-checkbox { width: 15px; height: 15px; accent-color: #1a4731; cursor: pointer; }

.chip {
  display: inline-block;
  margin: 1px 3px 1px 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.chip.rts { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.chip.ok { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
.chip.pending { background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
.chip.gold { background: #fdf6e3; color: #92700c; border: 1px solid #d4af37; }
.chip.dup { background: #eff6ff; color: #1d4ed8; border: 1px solid #93c5fd; }
.chip.mismatch { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
.chip.mapped { background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; }
.chip.unmapped { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
.chip.pending-geo { background: #ecfeff; color: #0e7490; border: 1px solid #67e8f9; }
.chip-btn {
  cursor: pointer;
  font-family: inherit;
}

.btn-actions {
  width: 28px; height: 28px; border: 0; border-radius: 6px;
  background: transparent; color: #64748b; cursor: pointer;
}
.btn-actions:hover { background: #f1f5f9; color: #1a4731; }
.ctx { padding: 4px 0; }
.ctx ion-item { --min-height: 38px; font-size: 0.88rem; }
.ctx ion-icon { color: #1a4731; }
.ctx .danger ion-icon { color: #b91c1c; }

.pager {
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  padding: 0.65rem; font-size: 0.85rem; color: #64748b; font-weight: 600;
}

.bulk-bar {
  position: sticky; bottom: 12px; margin: 0 auto; width: fit-content;
  background: #1a4731; color: #fff; border-radius: 999px;
  padding: 0.45rem 0.9rem; display: flex; align-items: center; gap: 0.65rem;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); z-index: 8;
}
.bulk-btn {
  border: 0; background: #d4af37; color: #1a4731; font-weight: 800;
  border-radius: 999px; padding: 4px 10px; cursor: pointer;
}
.bulk-btn.ghost { background: transparent; color: #fff; border: 1px solid #d1e0d6; }
.bulk-bar-enter-active, .bulk-bar-leave-active { transition: opacity 0.15s ease; }
.bulk-bar-enter-from, .bulk-bar-leave-to { opacity: 0; }

.dossier { max-width: 680px; margin: 0 auto; }
.dossier-head h2 { margin: 0; color: #1a4731; }
.dossier-head p { margin: 0.25rem 0 0.85rem; color: #64748b; }
.card {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem;
}
.info-row {
  display: flex; justify-content: space-between; gap: 1rem;
  padding: 0.45rem 0; border-bottom: 1px solid #e8f0ea; font-size: 0.9rem;
}
.info-row span { color: #64748b; }
.info-row strong { color: #1a4731; text-align: right; }
.st-pending { color: #d97706; }
.st-approved { color: #16a34a; }
.st-rts { color: #dc2626; }
.modal-actions { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
.modal-actions.stacked { flex-direction: column; }
.mismatch-banner {
  background: #fff7ed; border: 1px solid #fdba74; color: #9a3412;
  border-radius: 8px; padding: 0.65rem 0.75rem; margin-bottom: 0.75rem; font-size: 0.85rem;
}
.plots-head { display: flex; justify-content: space-between; align-items: center; }
.plots-head h3 { margin: 0; color: #1a4731; }
.plot-list { display: flex; flex-direction: column; gap: 0.55rem; margin-top: 0.6rem; }
.plot-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  padding: 0.65rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
}
.plot-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: flex-start; justify-content: flex-end; }
.plot-form, .map-form {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.15rem;
  padding-top: 0.65rem;
  border-top: 1px solid #e2e8f0;
}
.plot-form label, .map-form label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.plot-input {
  border: 1.5px solid #94a3b8;
  border-radius: 6px;
  padding: 6px 8px;
  color: #0f172a;
  background: #fff;
  font-family: inherit;
  font-size: 0.85rem;
}
.plot-input:focus {
  outline: none;
  border-color: #1a4731;
  box-shadow: 0 0 0 2px rgba(26, 71, 49, 0.14);
}
.span-2 { grid-column: 1 / -1; }
.form-legend {
  grid-column: 1 / -1;
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: #334155;
  font-weight: 700;
  text-transform: none;
}
.form-btns { display: flex; gap: 0.4rem; }
.gpx-hint { font-size: 0.75rem; color: #0f766e; font-weight: 600; text-transform: none; margin-top: 2px; }
.plot-row p { margin: 0.15rem 0 0; font-size: 0.82rem; color: #475569; }
.plot-meta { font-size: 0.75rem !important; color: #64748b !important; }
.plots-empty { color: #94a3b8; }
.rts-reason-box { margin-top: 0.75rem; padding: 0.75rem; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; }
.rts-reason-box p { margin: 0.3rem 0 0; color: #7f1d1d; }

.print-only { display: none; }
.lh-meta { margin: 2px 0 0; font-size: 0.78rem; color: #64748b; }

@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .rpt-shell, .rpt-content, .grid-shell, .table-scroll, .print-surface {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }
  .grid-shell { border: none; }
  .excel-table { min-width: 0 !important; }
  .excel-table thead th { position: static; background: #1a4731 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .print-document { display: block !important; }
}
</style>

<template>
  <ion-page>
    <AppHeader />

    <ion-content class="page-bg">
      <div class="shell">
        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading programs&hellip;</p>
        </div>

        <div v-else-if="error" class="center-state error">
          <p>{{ error }}</p>
          <ion-button size="small" @click="fetchPrograms">Retry</ion-button>
        </div>

        <div v-else-if="!programs.length" class="empty-panel">
          <h2>No subsidy programs yet</h2>
          <p>Create a campaign, then upload the masterlist so eligible farmers can receive it.</p>
          <div class="header-actions center-actions">
            <ion-button class="create-btn" @click="openCreateCampaign('hybrid')">
              <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
              New Hybrid campaign
            </ion-button>
            <ion-button class="create-btn" @click="openCreateCampaign('rcef')">
              <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
              New RCEF campaign
            </ion-button>
            <ion-button class="create-btn outline-btn" fill="outline" @click="fcaOpen = true">
              FCAs
            </ion-button>
            <ion-button class="create-btn outline-btn" fill="outline" @click="openIntake">
              <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
              Upload Masterlist
            </ion-button>
          </div>
        </div>

        <div v-else class="table-wrap">
          <div class="status-tabs" role="tablist" aria-label="Filter by program status">
            <div class="status-tab-list">
              <button
                v-for="tab in statusTabs"
                :key="tab.value"
                type="button"
                role="tab"
                class="status-tab"
                :class="{ active: statusFilter === tab.value }"
                :aria-selected="statusFilter === tab.value"
                @click="statusFilter = tab.value"
              >
                {{ tab.label }}
                <span class="tab-count">{{ tab.count }}</span>
              </button>
            </div>
            <div class="header-actions">
              <ion-button class="create-btn" @click="openCreateCampaign('hybrid')">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                New Hybrid campaign
              </ion-button>
              <ion-button class="create-btn" @click="openCreateCampaign('rcef')">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                New RCEF campaign
              </ion-button>
              <ion-button class="create-btn outline-btn" fill="outline" @click="fcaOpen = true">
                FCAs
              </ion-button>
              <ion-button class="create-btn outline-btn" fill="outline" @click="openIntake">
                <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
                Upload Regional Monthly Workbook
              </ion-button>
            </div>
          </div>

          <div class="table-tools">
            <label class="search-wrap">
              <ion-icon :icon="searchOutline" aria-hidden="true"></ion-icon>
              <input
                v-model="searchName"
                type="search"
                class="name-search"
                aria-label="Search by program name or season"
                placeholder="Search by program name or season…"
              />
            </label>
            <select v-model="statusFilter" class="tool-select" aria-label="Status">
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Completed">Completed</option>
            </select>
            <select v-model="cropFilter" class="tool-select" aria-label="Crop">
              <option value="">All crops</option>
              <option value="Rice">Rice</option>
              <option value="Corn">Corn</option>
              <option value="Both">Rice and Corn</option>
            </select>
            <select v-model="seedClassFilter" class="tool-select" aria-label="Seed class">
              <option value="">All seed classes</option>
              <option v-for="sc in SEED_CLASSES" :key="sc" :value="sc">{{ sc }}</option>
            </select>
            <select v-model="itemTypeFilter" class="tool-select" aria-label="Item type">
              <option value="">All item types</option>
              <option v-for="it in ALL_ITEM_TYPES" :key="it" :value="it">{{ itemTypeLabel(it) }}</option>
            </select>
          </div>

          <div class="table-scroll">
            <table class="program-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Crop</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Inventory</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredPrograms" :key="p.id">
                  <td>
                    <div class="program-name">{{ p.program_name }}</div>
                    <div class="row-meta">{{ allocationMeta(p) }}</div>
                  </td>
                  <td class="crop-cell">{{ cropLabel(p.target_crop) }}</td>
                  <td class="scope-cell">{{ scopeLabel(p) }}</td>
                  <td>
                    <span class="status-pill" :class="statusClass(p.status)">{{ p.status }}</span>
                  </td>
                  <td class="inv-cell">
                    <div class="inv-line">
                      <span class="inv-qty">{{ stockLine(p) }}</span>
                      <span v-if="p.is_low_stock" class="stock-badge">Low Stock</span>
                    </div>
                    <div
                      class="progress-track"
                      role="progressbar"
                      :aria-valuenow="claimedPct(p)"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      :aria-label="`${claimedPct(p)} percent claimed`"
                    >
                      <div class="progress-fill" :style="{ width: claimedPct(p) + '%' }"></div>
                    </div>
                    <div class="inv-sub">{{ claimedLine(p) }}</div>
                  </td>
                  <td class="row-actions">
                    <ion-button size="small" fill="solid" class="open-btn" @click="openMasterlist(p.id)">
                      Open Masterlist
                    </ion-button>
                    <ion-button
                      v-if="p.status === 'Draft'"
                      size="small"
                      fill="outline"
                      class="activate-btn"
                      :disabled="statusUpdatingId === p.id"
                      @click="confirmActivate(p)"
                    >
                      {{ statusUpdatingId === p.id ? 'Activating…' : 'Activate' }}
                    </ion-button>
                    <button
                      type="button"
                      class="more-btn"
                      :id="`prog-act-${p.id}`"
                      title="More actions"
                      :aria-label="`More actions for ${p.program_name}`"
                    >
                      <ion-icon :icon="ellipsisVertical"></ion-icon>
                    </button>
                    <ion-popover
                      :trigger="`prog-act-${p.id}`"
                      trigger-action="click"
                      side="left"
                      css-class="prog-more-pop"
                      :dismiss-on-select="true"
                    >
                      <ion-content>
                        <ion-list lines="none" class="ctx">
                          <ion-item
                            v-if="p.status === 'Draft'"
                            button
                            :detail="false"
                            :disabled="statusUpdatingId === p.id"
                            @click="confirmActivate(p)"
                          >
                            <ion-icon :icon="playCircleOutline" slot="start"></ion-icon>
                            <ion-label>
                              {{ statusUpdatingId === p.id ? 'Activating…' : 'Activate Program' }}
                            </ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="openRestock(p)">
                            <ion-icon :icon="cubeOutline" slot="start"></ion-icon>
                            <ion-label>Log Delivery Batch</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="openVarieties(p)">
                            <ion-icon :icon="listOutline" slot="start"></ion-icon>
                            <ion-label>Manage Seed Varieties</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="openEditCampaign(p)">
                            <ion-icon :icon="createOutline" slot="start"></ion-icon>
                            <ion-label>Edit Campaign</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="openSettings(p)">
                            <ion-icon :icon="settingsOutline" slot="start"></ion-icon>
                            <ion-label>Configure Stock Rules</ion-label>
                          </ion-item>
                          <ion-item
                            v-if="p.status !== 'Completed'"
                            button
                            :detail="false"
                            class="warn"
                            :disabled="statusUpdatingId === p.id"
                            @click="confirmComplete(p)"
                          >
                            <ion-icon :icon="checkmarkDoneOutline" slot="start"></ion-icon>
                            <ion-label>
                              {{ statusUpdatingId === p.id ? 'Updating…' : 'Mark Program as Completed' }}
                            </ion-label>
                          </ion-item>
                        </ion-list>
                      </ion-content>
                    </ion-popover>
                  </td>
                </tr>
                <tr v-if="!filteredPrograms.length">
                  <td colspan="5" class="empty-row">No programs match this search or filter.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- FCA LIST -->
      <ion-modal :is-open="fcaOpen" @didDismiss="fcaOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Registered FCAs</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="fcaOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="modal-hint">
            Add each Irrigators Association or cooperative once. Variety rows pick from this list so DA endorsement reports stay consistent.
          </p>
          <div class="fca-add-row">
            <ion-input
              class="fca-add-input"
              placeholder="FCA name"
              :value="fcaDraft"
              @ionInput="(e: any) => fcaDraft = String(e.detail.value ?? '')"
            ></ion-input>
            <ion-button class="create-btn" :disabled="savingFca" @click="addFca">
              {{ savingFca ? 'Saving…' : 'Add' }}
            </ion-button>
          </div>
          <ul class="fca-list">
            <li v-for="fca in fcas" :key="fca.id">
              <span :class="{ inactive: !fca.is_active }">{{ fca.name }}</span>
              <button type="button" class="fca-toggle" @click="toggleFca(fca)">
                {{ fca.is_active ? 'Deactivate' : 'Restore' }}
              </button>
            </li>
            <li v-if="!fcas.length" class="fca-empty">No FCAs yet.</li>
          </ul>
        </ion-content>
      </ion-modal>

      <!-- CREATE CAMPAIGN MODAL -->
      <ion-modal :is-open="createOpen" @didDismiss="createOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Create Campaign</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="createOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="modal-hint">
            DA Banner Hybrid (the 7,000-bag load) and PhilRice RCEF (the 738 ha inbred load) are separate campaigns with separate audits. Do not mix them.
            Farmers with deceased, OFW, or no-farm remarks stay excluded. Allocation uses the farm address.
          </p>

          <ion-item class="modal-input">
            <ion-input
              label="Campaign name *"
              label-placement="floating"
              :value="createForm.program_name"
              @ionInput="(e: any) => createForm.program_name = String(e.detail.value ?? '')"
            ></ion-input>
          </ion-item>

          <div class="date-row">
            <ion-item class="modal-input">
              <ion-select
                label="Crop *"
                label-placement="floating"
                interface="popover"
                :value="createForm.target_crop"
                @ionChange="(e: any) => createForm.target_crop = e.detail.value"
              >
                <ion-select-option value="Rice">Rice</ion-select-option>
                <ion-select-option value="Corn">Corn</ion-select-option>
                <ion-select-option value="Both">Rice and Corn</ion-select-option>
                <ion-select-option value="HVCC">HVCC</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item v-if="createForm.target_crop === 'HVCC'" class="modal-input">
              <ion-input
                label="HVCC commodity"
                label-placement="floating"
                :value="createForm.hvcc_commodity"
                @ionInput="(e: any) => createForm.hvcc_commodity = String(e.detail.value ?? '')"
              ></ion-input>
            </ion-item>
          </div>

          <div class="date-row">
            <ion-item class="modal-input">
              <ion-select
                label="Seed class *"
                label-placement="floating"
                interface="popover"
                :value="createForm.seed_class"
                @ionChange="onCreateSeedClass"
              >
                <ion-select-option v-for="sc in SEED_CLASSES" :key="sc" :value="sc">{{ sc }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item class="modal-input">
              <ion-select
                label="Item type *"
                label-placement="floating"
                interface="popover"
                :value="createForm.item_type"
                @ionChange="(e: any) => createForm.item_type = e.detail.value"
              >
                <ion-select-option v-for="it in createItemTypes" :key="it" :value="it">{{ itemTypeLabel(it) }}</ion-select-option>
              </ion-select>
            </ion-item>
          </div>

          <div class="date-row">
            <ion-item class="modal-input">
              <ion-input
                type="date"
                label="Delivery start"
                label-placement="floating"
                :value="createForm.delivery_start_date"
                @ionInput="(e: any) => createForm.delivery_start_date = String(e.detail.value ?? '')"
              ></ion-input>
            </ion-item>
            <ion-item class="modal-input">
              <ion-input
                type="date"
                label="Delivery end"
                label-placement="floating"
                :value="createForm.delivery_end_date"
                @ionInput="(e: any) => createForm.delivery_end_date = String(e.detail.value ?? '')"
              ></ion-input>
            </ion-item>
          </div>

          <template v-if="createForm.item_type === 'seed'">
            <div class="date-row">
              <ion-item class="modal-input">
                <ion-input
                  type="number"
                  label="Kg per bag *"
                  label-placement="floating"
                  min="0.01"
                  :value="createForm.bag_size_kg"
                  @ionInput="(e: any) => createForm.bag_size_kg = e.detail.value === '' ? 15 : Number(e.detail.value)"
                ></ion-input>
              </ion-item>
              <ion-item class="modal-input">
                <ion-input
                  type="number"
                  label="Bags per hectare *"
                  label-placement="floating"
                  min="0.01"
                  :value="createForm.bags_per_hectare"
                  @ionInput="(e: any) => createForm.bags_per_hectare = e.detail.value === '' ? 1 : Number(e.detail.value)"
                ></ion-input>
              </ion-item>
            </div>
            <p class="modal-hint">
              Rate: {{ createSeedKgPerHa.toLocaleString('en-PH') }} kg/ha
              ({{ createForm.bags_per_hectare }} bag{{ Number(createForm.bags_per_hectare) === 1 ? '' : 's' }}
              × {{ createForm.bag_size_kg }} kg).
            </p>
          </template>
          <div v-else class="date-row">
            <ion-item class="modal-input">
              <ion-input
                type="number"
                :label="`${createPrimaryUnit} per hectare *`"
                label-placement="floating"
                min="0.01"
                :value="createForm.items_per_hectare"
                @ionInput="(e: any) => createForm.items_per_hectare = e.detail.value === '' ? 1 : Number(e.detail.value)"
              ></ion-input>
            </ion-item>
            <ion-item v-if="createIsDual" class="modal-input">
              <ion-input
                type="number"
                :label="`${createSecondaryUnit} per hectare *`"
                label-placement="floating"
                min="0.01"
                :value="createForm.secondary_items_per_hectare"
                @ionInput="(e: any) => createForm.secondary_items_per_hectare = e.detail.value === '' ? 1 : Number(e.detail.value)"
              ></ion-input>
            </ion-item>
          </div>

          <div class="date-row">
            <ion-item class="modal-input">
              <ion-input
                type="number"
                label="Max hectares *"
                label-placement="floating"
                min="0.01"
                :value="createForm.max_hectares_limit"
                @ionInput="(e: any) => createForm.max_hectares_limit = e.detail.value === '' ? 3 : Number(e.detail.value)"
              ></ion-input>
            </ion-item>
            <ion-item class="modal-input">
              <ion-input
                type="number"
                label="Min hectares"
                label-placement="floating"
                min="0"
                :value="createForm.min_hectares_limit"
                @ionInput="(e: any) => createForm.min_hectares_limit = e.detail.value === '' ? 0 : Number(e.detail.value)"
              ></ion-input>
            </ion-item>
          </div>

          <p class="modal-hint">Campaign barangays. Leave all selected to cover every barangay.</p>
          <BarangayMultiPicker
            :barangays="officialBarangays"
            v-model="createForm.target_barangays"
            v-model:select-all="createSelectAllBarangays"
          />

          <p class="modal-hint section-gap">
            Variety stock in bags. Example: LP 937 — 550, JACKPOT — 1,090. A barangay assignment is only a recommendation.
          </p>
          <VarietyBreakdownEditor
            v-model="createForm.varieties"
            :barangays="officialBarangays"
            :fcas="activeFcaNames"
            :unit-label="createForm.item_type === 'seed' ? 'bags' : createPrimaryUnit"
            :bag-size-kg="createForm.item_type === 'seed' ? createForm.bag_size_kg : null"
          />

          <ion-button expand="block" class="save-btn" :disabled="savingCreate" @click="submitCreateCampaign">
            {{ savingCreate ? 'Saving…' : 'Create Campaign' }}
          </ion-button>
        </ion-content>
      </ion-modal>

      <!-- EDIT CAMPAIGN MODAL -->
      <ion-modal :is-open="editOpen" @didDismiss="editOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Edit Campaign</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="editOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="activeProgram">
            <p class="modal-hint">
              Update the campaign name, delivery window, and allocation rates.
              Stock totals and subsidy line stay unchanged.
            </p>
            <p v-if="(activeProgram.claimed_count || 0) > 0" class="modal-warn">
              This campaign already has {{ activeProgram.claimed_count }} claim(s).
              Rate changes apply to future releases only.
            </p>

            <ion-item class="modal-input">
              <ion-input
                label="Campaign name *"
                label-placement="floating"
                :value="editForm.program_name"
                @ionInput="(e: any) => editForm.program_name = String(e.detail.value ?? '')"
              ></ion-input>
            </ion-item>

            <div class="date-row">
              <ion-item class="modal-input">
                <ion-input
                  type="date"
                  label="Delivery start"
                  label-placement="floating"
                  :value="editForm.delivery_start_date"
                  @ionInput="(e: any) => editForm.delivery_start_date = String(e.detail.value ?? '')"
                ></ion-input>
              </ion-item>
              <ion-item class="modal-input">
                <ion-input
                  type="date"
                  label="Delivery end"
                  label-placement="floating"
                  :value="editForm.delivery_end_date"
                  @ionInput="(e: any) => editForm.delivery_end_date = String(e.detail.value ?? '')"
                ></ion-input>
              </ion-item>
            </div>

            <div class="date-row">
              <ion-item class="modal-input">
                <ion-input
                  type="number"
                  label="Bags per hectare *"
                  label-placement="floating"
                  min="0.01"
                  :value="editForm.items_per_hectare"
                  @ionInput="(e: any) => editForm.items_per_hectare = e.detail.value === '' ? 1 : Number(e.detail.value)"
                ></ion-input>
              </ion-item>
              <ion-item class="modal-input">
                <ion-input
                  type="number"
                  label="Max hectares *"
                  label-placement="floating"
                  min="0.01"
                  :value="editForm.max_hectares_limit"
                  @ionInput="(e: any) => editForm.max_hectares_limit = e.detail.value === '' ? 3 : Number(e.detail.value)"
                ></ion-input>
              </ion-item>
            </div>

            <ion-button expand="block" class="save-btn" :disabled="savingEdit" @click="submitEditCampaign">
              {{ savingEdit ? 'Saving…' : 'Save Campaign' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- LOG DELIVERY MODAL -->
      <ion-modal :is-open="restockOpen" @didDismiss="restockOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Log Incoming Delivery</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="restockOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="activeProgram">
            <p class="modal-program">{{ activeProgram.program_name }}</p>
            <p class="modal-hint">
              Current stock: <strong>{{ stockLine(activeProgram) }}</strong>
            </p>

            <template v-if="isSeedWithBags(activeProgram)">
              <ion-item class="modal-input">
                <ion-input
                  type="number"
                  :value="restockQty"
                  @ionInput="(e: any) => restockQty = e.detail.value === '' ? null : Number(e.detail.value)"
                  label="Bags Delivered *"
                  label-placement="floating"
                  placeholder="e.g., 550"
                  min="0.01"
                ></ion-input>
              </ion-item>
              <p v-if="Number(restockQty) > 0" class="modal-hint">
                = {{ (Number(restockQty) * Number(activeProgram.bag_size_kg)).toLocaleString('en-PH') }} kg
                at {{ activeProgram.bag_size_kg }} kg/bag
              </p>
            </template>
            <template v-else>
              <ion-item class="modal-input">
                <ion-input
                  type="number"
                  :value="restockQty"
                  @ionInput="(e: any) => restockQty = e.detail.value === '' ? null : Number(e.detail.value)"
                  :label="`${activeProgram.unit_of_measurement} Delivered *`"
                  label-placement="floating"
                  placeholder="e.g., 500"
                  min="0.01"
                ></ion-input>
              </ion-item>
              <ion-item v-if="activeProgram.secondary_unit" class="modal-input">
                <ion-input
                  type="number"
                  :value="restockQtySecondary"
                  @ionInput="(e: any) => restockQtySecondary = e.detail.value === '' ? null : Number(e.detail.value)"
                  :label="`${activeProgram.secondary_unit} Delivered`"
                  label-placement="floating"
                  placeholder="e.g., 25"
                  min="0.01"
                ></ion-input>
              </ion-item>
            </template>

            <ion-button expand="block" class="save-btn" :disabled="savingRestock || !(Number(restockQty) >= 0.01)" @click="submitRestock">
              <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
              {{ savingRestock ? 'Saving…' : 'Add to Stock' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- VARIETY MANAGEMENT MODAL -->
      <ion-modal :is-open="varietiesOpen" @didDismiss="varietiesOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Seed Varieties</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="varietiesOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="activeProgram">
            <p class="modal-program">{{ activeProgram.program_name }}</p>
            <p class="modal-hint">
              Enter each seed variety and its allocation. The sum becomes the program's opening stock.
              A barangay assignment only highlights the Recommended chip. Technicians can still issue any variety with stock.
              Saving replaces the existing breakdown (unless claims already exist, in which case only new varieties are added).
            </p>
            <VarietyBreakdownEditor
              v-model="varietyRows"
              :barangays="officialBarangays"
              :fcas="activeFcaNames"
              :unit-label="activeProgram.item_type === 'seed' ? 'bags' : activeProgram.unit_of_measurement"
              :bag-size-kg="activeProgram.item_type === 'seed' ? activeProgram.bag_size_kg : null"
            />
            <ion-button expand="block" class="save-btn" :disabled="savingVarieties" @click="submitVarieties">
              {{ savingVarieties ? 'Saving…' : 'Save Varieties' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- STOCK SETTINGS MODAL -->
      <ion-modal :is-open="settingsOpen" @didDismiss="settingsOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Stock Settings</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="settingsOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="activeProgram">
            <p class="modal-program">{{ activeProgram.program_name }}</p>
            <p v-if="activeProgram.item_type" class="modal-hint">
              {{ catalogSummary(activeProgram.target_crop, activeProgram.seed_class, activeProgram.item_type) }} — units are set by the MAO catalog.
            </p>

            <ion-item v-if="!activeProgram.item_type" class="modal-input">
              <ion-select
                :value="settingsUnit"
                interface="popover"
                label="Unit of Measurement"
                label-placement="floating"
                @ionChange="(e: any) => settingsUnit = e.detail.value"
              >
                <ion-select-option value="Bags">Bags</ion-select-option>
                <ion-select-option value="Sacks">Sacks</ion-select-option>
                <ion-select-option value="Kg">Kg</ion-select-option>
                <ion-select-option value="Cash (PHP)">Cash (PHP)</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="modal-input">
              <ion-input
                type="number"
                :value="settingsReorder"
                @ionInput="(e: any) => settingsReorder = e.detail.value === '' ? null : Number(e.detail.value)"
                :label="`Minimum Reorder Level (${activeProgram.unit_of_measurement})`"
                label-placement="floating"
                placeholder="Leave blank to disable alerts"
                min="0"
              ></ion-input>
            </ion-item>
            <ion-item v-if="activeProgram.secondary_unit" class="modal-input">
              <ion-input
                type="number"
                :value="settingsReorderSecondary"
                @ionInput="(e: any) => settingsReorderSecondary = e.detail.value === '' ? null : Number(e.detail.value)"
                :label="`Minimum Reorder Level (${activeProgram.secondary_unit})`"
                label-placement="floating"
                placeholder="Leave blank to disable alerts"
                min="0"
              ></ion-input>
            </ion-item>

            <ion-button expand="block" class="save-btn" :disabled="savingSettings" @click="submitSettings">
              <ion-icon slot="start" :icon="saveOutline"></ion-icon>
              {{ savingSettings ? 'Saving…' : 'Save Settings' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import BarangayMultiPicker from '@/components/BarangayMultiPicker.vue';
import VarietyBreakdownEditor, { type VarietyDraft } from '@/components/Subsidy/VarietyBreakdownEditor.vue';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonModal, IonList, IonItem, IonInput, IonSelect,
  IonSelectOption, IonPopover, IonLabel, toastController, alertController,
} from '@ionic/vue';
import {
  refreshOutline, cloudUploadOutline, addCircleOutline, settingsOutline, saveOutline,
  searchOutline, ellipsisVertical, cubeOutline, checkmarkDoneOutline,
  playCircleOutline, listOutline, createOutline,
} from 'ionicons/icons';
import apiClient from '@/utils/axios';
import { cropLabel } from '@/utils/cropLabel';
import { promptAuditRemarks } from '@/composables/promptAuditRemarks';
import {
  SEED_CLASSES, itemTypeLabel, catalogSummary, itemTypesFor, isDualUnit, getCatalogEntry,
  type SeedClass, type ItemType,
} from '@/constants/subsidyCatalog';
import { useOfficialBarangays } from '@/composables/useOfficialBarangays';

const ALL_ITEM_TYPES: ItemType[] = ['seed', 'abono', 'liquid_fertilizer', 'wettable', 'cash'];

interface SubsidyProgramRow {
  id: string;
  program_name: string;
  target_crop: string;
  target_barangays?: string[] | null;
  seed_class?: SeedClass | null;
  item_type?: ItemType | null;
  max_hectares_limit: number;
  min_hectares_limit: number;
  items_per_hectare: number;
  secondary_items_per_hectare?: number | null;
  bag_size_kg?: number | null;
  status: string;
  unit_of_measurement: string;
  secondary_unit?: string | null;
  total_quantity: number;
  remaining_quantity: number;
  reorder_level: number | null;
  secondary_total_quantity?: number | null;
  secondary_remaining_quantity?: number | null;
  secondary_reorder_level?: number | null;
  is_low_stock: boolean;
  beneficiaries_count: number;
  claimed_count: number;
  claimed_bags?: number | null;
  delivery_start_date?: string | null;
  delivery_end_date?: string | null;
  created_at?: string;
  varieties?: Array<{
    id: string;
    variety_name: string;
    total_quantity: number;
    remaining_quantity: number;
    unit?: string | null;
    target_fca?: string | null;
    target_barangays?: string[] | null;
  }>;
}

const router = useRouter();
const programs = ref<SubsidyProgramRow[]>([]);
const loading = ref(true);
const statusUpdatingId = ref<string | null>(null);
const searchName = ref('');
const cropFilter = ref('');
const seedClassFilter = ref('');
const itemTypeFilter = ref('');
const statusFilter = ref('');
const error = ref('');

const activeProgram = ref<SubsidyProgramRow | null>(null);
const restockOpen = ref(false);
const settingsOpen = ref(false);

const restockQty = ref<number | null>(null);
const restockQtySecondary = ref<number | null>(null);
const savingRestock = ref(false);

const settingsUnit = ref('');
const settingsReorder = ref<number | null>(null);
const settingsReorderSecondary = ref<number | null>(null);
const savingSettings = ref(false);

const varietiesOpen = ref(false);
const varietyRows = ref<VarietyDraft[]>([]);
const savingVarieties = ref(false);

const { barangays: officialBarangays } = useOfficialBarangays();
const createOpen = ref(false);
const fcaOpen = ref(false);
const fcas = ref<Array<{ id: string; name: string; is_active: boolean }>>([]);
const fcaDraft = ref('');
const savingFca = ref(false);
const activeFcaNames = computed(() => fcas.value.filter((row) => row.is_active).map((row) => row.name));
const savingCreate = ref(false);
const createSelectAllBarangays = ref(true);

const blankVariety = (): VarietyDraft => ({
  variety_name: '',
  quantity: null,
  target_fca: '',
  target_barangays: [],
});

const createForm = ref({
  program_name: '',
  target_crop: 'Rice',
  hvcc_commodity: '',
  seed_class: 'Hybrid' as SeedClass,
  item_type: 'seed' as ItemType,
  items_per_hectare: 1,
  secondary_items_per_hectare: 1,
  bag_size_kg: 15,
  bags_per_hectare: 1,
  max_hectares_limit: 3,
  min_hectares_limit: 0,
  delivery_start_date: '',
  delivery_end_date: '',
  target_barangays: [] as string[],
  varieties: [blankVariety()] as VarietyDraft[],
});

const editOpen = ref(false);
const savingEdit = ref(false);
const editForm = ref({
  program_name: '',
  delivery_start_date: '',
  delivery_end_date: '',
  items_per_hectare: 1,
  max_hectares_limit: 3,
});

const toast = async (message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'success') => {
  const t = await toastController.create({ message, duration: 2800, color, position: 'top' });
  await t.present();
};

const fmt = (v: any) => Number(v ?? 0).toLocaleString('en-PH');

const searchedPrograms = computed(() => {
  const q = searchName.value.trim().toLowerCase();
  return programs.value.filter((p) => {
    if (q && !p.program_name.toLowerCase().includes(q)) return false;
    if (cropFilter.value && p.target_crop !== cropFilter.value) return false;
    if (seedClassFilter.value && p.seed_class !== seedClassFilter.value) return false;
    if (itemTypeFilter.value && p.item_type !== itemTypeFilter.value) return false;
    return true;
  });
});

const statusCounts = computed(() => {
  const list = searchedPrograms.value;
  return {
    all: list.length,
    active: list.filter((p) => p.status === 'Active').length,
    draft: list.filter((p) => p.status === 'Draft').length,
    completed: list.filter((p) => p.status === 'Completed').length,
  };
});

const statusTabs = computed(() => [
  { value: '', label: 'All', count: statusCounts.value.all },
  { value: 'Active', label: 'Active', count: statusCounts.value.active },
  { value: 'Draft', label: 'Draft', count: statusCounts.value.draft },
  { value: 'Completed', label: 'Completed', count: statusCounts.value.completed },
]);

const filteredPrograms = computed(() => {
  if (!statusFilter.value) return searchedPrograms.value;
  return searchedPrograms.value.filter((p) => p.status === statusFilter.value);
});

const statusClass = (status: string) => {
  if (status === 'Active') return 'active';
  if (status === 'Completed') return 'completed';
  return 'draft';
};

const claimedPct = (p: SubsidyProgramRow) => {
  if (isSeedWithBags(p)) {
    const s = bagStockTotals(p);
    if (!s.bagsTotal) return 0;
    const claimedBags = Number(p.claimed_bags) || Math.max(0, s.bagsTotal - s.bagsLeft);
    return Math.round((claimedBags / s.bagsTotal) * 100);
  }
  const total = Number(p.beneficiaries_count) || 0;
  if (!total) return 0;
  return Math.round((Number(p.claimed_count) / total) * 100);
};

const allocationMeta = (p: SubsidyProgramRow) => {
  const catalogTag = p.seed_class && p.item_type ? catalogSummary(null, p.seed_class, p.item_type) : '';
  let rate = '';
  if (p.item_type === 'seed' && Number(p.bag_size_kg) > 0) {
    const bagsHa = p.secondary_unit
      ? Number(p.secondary_items_per_hectare ?? 1)
      : Number(p.items_per_hectare ?? 1);
    rate = `${p.bag_size_kg} kg/bag · ${bagsHa} bag${bagsHa === 1 ? '' : 's'}/ha`;
  } else {
    const unit = p.unit_of_measurement || 'Sacks';
    rate = `${p.items_per_hectare} ${unit}/ha`;
    if (p.secondary_unit && p.secondary_items_per_hectare != null) {
      rate += ` + ${p.secondary_items_per_hectare} ${p.secondary_unit}/ha`;
    }
  }
  const cap = `Cap ${Number(p.max_hectares_limit).toFixed(2)} ha`;
  const min = Number(p.min_hectares_limit ?? 0);
  const parts = [catalogTag, rate, min > 0 ? `Min ${min.toFixed(2)} ha` : '', cap].filter(Boolean);
  return parts.join(' · ');
};

const scopeLabel = (p: SubsidyProgramRow) => {
  const list = p.target_barangays;
  if (!list || !list.length) return 'All barangays';
  if (list.length <= 2) return list.join(', ');
  return `${list.length} barangays`;
};

const fetchPrograms = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/subsidies');
    programs.value = res.data?.data ?? [];
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load subsidy programs. Run migrations if tables are missing.';
  } finally {
    loading.value = false;
  }
};

const openIntake = () => {
  router.push('/admin/subsidies/import');
};

const createItemTypes = computed(() => itemTypesFor(createForm.value.seed_class));
const createCatalog = computed(() => getCatalogEntry(createForm.value.seed_class, createForm.value.item_type));
const createIsDual = computed(() => isDualUnit(createForm.value.seed_class, createForm.value.item_type));
const createPrimaryUnit = computed(() => createCatalog.value?.unit || 'Bags');
const createSecondaryUnit = computed(() => createCatalog.value?.secondaryUnit || 'bags');
const createSeedKgPerHa = computed(() =>
  Number(createForm.value.bags_per_hectare || 0) * Number(createForm.value.bag_size_kg || 0)
);

const isSeedWithBags = (p: SubsidyProgramRow | null | undefined) =>
  !!p && p.item_type === 'seed' && Number(p.bag_size_kg) > 0;

const bagStockTotals = (p: SubsidyProgramRow) => {
  const size = Number(p.bag_size_kg) || 0;
  if (p.secondary_unit) {
    const bagsTotal = Number(p.secondary_total_quantity) || 0;
    const bagsLeft = Number(p.secondary_remaining_quantity) || 0;
    // Older Hybrid rows may still show bags only on varieties / kg primary.
    if (bagsTotal <= 0 && Number(p.total_quantity) > 0 && size > 0) {
      const derivedTotal = Math.round(Number(p.total_quantity) / size);
      const derivedLeft = Math.round(Number(p.remaining_quantity) / size);
      return {
        bagsLeft: derivedLeft,
        bagsTotal: derivedTotal,
        kgLeft: Number(p.remaining_quantity) || 0,
        kgTotal: Number(p.total_quantity) || 0,
      };
    }
    return {
      bagsLeft,
      bagsTotal,
      kgLeft: Number(p.remaining_quantity) || bagsLeft * size,
      kgTotal: Number(p.total_quantity) || bagsTotal * size,
    };
  }
  const bagsTotal = Number(p.total_quantity) || 0;
  const bagsLeft = Number(p.remaining_quantity) || 0;
  return {
    bagsLeft,
    bagsTotal,
    kgLeft: bagsLeft * size,
    kgTotal: bagsTotal * size,
  };
};

const stockLine = (p: SubsidyProgramRow) => {
  if (isSeedWithBags(p)) {
    const s = bagStockTotals(p);
    return `${fmt(s.bagsLeft)} / ${fmt(s.bagsTotal)} bags (${fmt(s.kgLeft)} / ${fmt(s.kgTotal)} kg)`;
  }
  let line = `${fmt(p.remaining_quantity)} / ${fmt(p.total_quantity)} ${p.unit_of_measurement}`;
  if (p.secondary_unit) {
    line += ` · ${fmt(p.secondary_remaining_quantity)} / ${fmt(p.secondary_total_quantity)} ${p.secondary_unit}`;
  }
  return line;
};

const claimedLine = (p: SubsidyProgramRow) => {
  if (isSeedWithBags(p)) {
    const s = bagStockTotals(p);
    const claimedBags = Number(p.claimed_bags) || Math.max(0, s.bagsTotal - s.bagsLeft);
    const size = Number(p.bag_size_kg) || 0;
    const claimedKg = claimedBags * size;
    return `${fmt(claimedBags)} / ${fmt(s.bagsTotal)} bags (${fmt(claimedKg)} / ${fmt(s.kgTotal)} kg)`;
  }
  return `${claimedPct(p)}% Claimed`;
};

const onCreateSeedClass = (e: any) => {
  const next = e.detail.value as SeedClass;
  createForm.value.seed_class = next;
  const types = itemTypesFor(next);
  if (!types.includes(createForm.value.item_type)) {
    createForm.value.item_type = types[0] || 'seed';
  }
  if (createForm.value.item_type === 'seed') {
    const hybrid = next === 'Hybrid';
    createForm.value.bag_size_kg = hybrid ? 15 : 20;
    createForm.value.bags_per_hectare = hybrid ? 1 : 2;
  }
};

const varietyPayload = (rows: VarietyDraft[]) =>
  rows
    .filter((v) => v.variety_name.trim() && (v.quantity ?? 0) >= 0)
    .map((v) => ({
      variety_name: v.variety_name.trim(),
      quantity: Number(v.quantity) || 0,
      target_fca: v.target_fca.trim() || null,
      target_barangays: v.target_barangays.length ? v.target_barangays : null,
    }));

const openCreateCampaign = (line: 'hybrid' | 'rcef' = 'hybrid') => {
  const hybrid = line === 'hybrid';
  const bagSize = hybrid ? 15 : 20;
  const bagsPerHa = hybrid ? 1 : 2;
  createForm.value = {
    program_name: hybrid
      ? 'National Rice Program - 2026 Wet Season Hybrid Seeds'
      : 'PhilRice RCEF - 2026 Wet Season Certified Inbred Seeds',
    target_crop: 'Rice',
    hvcc_commodity: '',
    seed_class: hybrid ? 'Hybrid' : 'Inbred',
    item_type: 'seed',
    items_per_hectare: bagsPerHa * bagSize,
    secondary_items_per_hectare: hybrid ? bagsPerHa : 1,
    bag_size_kg: bagSize,
    bags_per_hectare: bagsPerHa,
    max_hectares_limit: 3,
    min_hectares_limit: 0,
    delivery_start_date: '',
    delivery_end_date: '',
    target_barangays: [],
    varieties: [blankVariety()],
  };
  createSelectAllBarangays.value = true;
  createOpen.value = true;
};

const fetchFcas = async () => {
  try {
    const res = await apiClient.get('/fcas');
    fcas.value = res.data?.data ?? [];
  } catch {
    fcas.value = [];
  }
};

const addFca = async () => {
  const name = fcaDraft.value.trim();
  if (!name) {
    await toast('Enter an FCA name.', 'warning');
    return;
  }
  savingFca.value = true;
  try {
    const res = await apiClient.post('/fcas', { name });
    await toast(res.data?.message || 'FCA added.', 'success');
    fcaDraft.value = '';
    await fetchFcas();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Could not add that FCA.', 'danger');
  } finally {
    savingFca.value = false;
  }
};

const toggleFca = async (fca: { id: string; is_active: boolean }) => {
  try {
    await apiClient.patch(`/fcas/${fca.id}`, { is_active: !fca.is_active });
    await fetchFcas();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Could not update that FCA.', 'danger');
  }
};

const submitCreateCampaign = async () => {
  const name = createForm.value.program_name.trim();
  if (!name) {
    await toast('Enter a campaign name.', 'warning');
    return;
  }
  const maxHa = Number(createForm.value.max_hectares_limit);
  const minHa = Number(createForm.value.min_hectares_limit) || 0;
  const isSeed = createForm.value.item_type === 'seed';
  const bagSize = Number(createForm.value.bag_size_kg);
  const bagsPerHa = Number(createForm.value.bags_per_hectare);
  let primaryRate = Number(createForm.value.items_per_hectare);
  let secondaryRate = Number(createForm.value.secondary_items_per_hectare);

  if (isSeed) {
    if (!(bagSize > 0) || !(bagsPerHa > 0)) {
      await toast('Kg per bag and bags per hectare must be greater than zero.', 'warning');
      return;
    }
    // Hybrid stores kg/ha primary + bags/ha secondary. Inbred stores bags/ha primary.
    if (createIsDual.value) {
      primaryRate = bagsPerHa * bagSize;
      secondaryRate = bagsPerHa;
    } else {
      primaryRate = bagsPerHa;
      secondaryRate = 0;
    }
  }

  if (!(primaryRate > 0) || !(maxHa > 0)) {
    await toast('Rate per hectare and max hectares must be greater than zero.', 'warning');
    return;
  }
  if (minHa > maxHa) {
    await toast('Minimum hectares cannot exceed the maximum hectares cap.', 'warning');
    return;
  }
  if (createForm.value.delivery_start_date && createForm.value.delivery_end_date
    && createForm.value.delivery_end_date < createForm.value.delivery_start_date) {
    await toast('Delivery end must be on or after the start date.', 'warning');
    return;
  }
  if (!isSeed && createIsDual.value && !(secondaryRate > 0)) {
    await toast(`Enter a ${createSecondaryUnit.value} per hectare rate.`, 'warning');
    return;
  }

  const varieties = varietyPayload(createForm.value.varieties).map((row) => ({
    ...row,
    unit: isSeed ? 'bags' : undefined,
  }));
  savingCreate.value = true;
  try {
    const res = await apiClient.post('/subsidies', {
      program_name: name,
      target_crop: createForm.value.target_crop,
      hvcc_commodity: createForm.value.target_crop === 'HVCC' ? (createForm.value.hvcc_commodity.trim() || null) : null,
      seed_class: createForm.value.seed_class,
      item_type: createForm.value.item_type,
      items_per_hectare: primaryRate,
      secondary_items_per_hectare: createIsDual.value ? secondaryRate : null,
      bag_size_kg: isSeed ? bagSize : null,
      max_hectares_limit: maxHa,
      min_hectares_limit: minHa,
      delivery_start_date: createForm.value.delivery_start_date || null,
      delivery_end_date: createForm.value.delivery_end_date || null,
      target_barangays: createSelectAllBarangays.value ? null : createForm.value.target_barangays,
      varieties,
      status: 'Draft',
    });
    await toast(res.data?.message || 'Subsidy campaign created.', 'success');
    createOpen.value = false;
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Could not create campaign.', 'danger');
  } finally {
    savingCreate.value = false;
  }
};

const openMasterlist = (id: string) => {
  router.push(`/admin/subsidies/${id}/masterlist`);
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const openEditCampaign = (p: SubsidyProgramRow) => {
  activeProgram.value = p;
  editForm.value = {
    program_name: p.program_name || '',
    delivery_start_date: toDateInput(p.delivery_start_date),
    delivery_end_date: toDateInput(p.delivery_end_date),
    items_per_hectare: Number(p.items_per_hectare) || 1,
    max_hectares_limit: Number(p.max_hectares_limit) || 3,
  };
  editOpen.value = true;
};

const submitEditCampaign = async () => {
  if (!activeProgram.value) return;
  const name = editForm.value.program_name.trim();
  if (!name) {
    await toast('Enter a campaign name.', 'warning');
    return;
  }
  const bagsPerHa = Number(editForm.value.items_per_hectare);
  const maxHa = Number(editForm.value.max_hectares_limit);
  if (!(bagsPerHa > 0) || !(maxHa > 0)) {
    await toast('Bags per hectare and max hectares must be greater than zero.', 'warning');
    return;
  }

  const remarks = await promptAuditRemarks({
    header: 'Justify campaign edit',
    message: 'Explain why this subsidy campaign is being updated.',
  });
  if (!remarks) return;

  savingEdit.value = true;
  try {
    const res = await apiClient.patch(`/subsidies/${activeProgram.value.id}`, {
      program_name: name,
      delivery_start_date: editForm.value.delivery_start_date || null,
      delivery_end_date: editForm.value.delivery_end_date || null,
      items_per_hectare: bagsPerHa,
      max_hectares_limit: maxHa,
      audit_remarks: remarks,
    });
    await toast(res.data?.message || 'Subsidy campaign updated.', 'success');
    editOpen.value = false;
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Could not update campaign.', 'danger');
  } finally {
    savingEdit.value = false;
  }
};

const confirmActivate = async (p: SubsidyProgramRow) => {
  const alert = await alertController.create({
    header: 'Activate this program?',
    message: `“${p.program_name}” will become available for field release. Technicians can start dispensing subsidies to farmers on the masterlist.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Activate', handler: () => updateProgramStatus(p, 'Active') },
    ],
  });
  await alert.present();
};

const confirmComplete = async (p: SubsidyProgramRow) => {
  const alert = await alertController.create({
    header: 'Mark program completed?',
    message: `Claims will freeze. The masterlist and subsidy report stay as history. “${p.program_name}” will not be deleted.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Mark Completed', handler: () => updateProgramStatus(p, 'Completed') },
    ],
  });
  await alert.present();
};

const updateProgramStatus = async (p: SubsidyProgramRow, status: 'Active' | 'Completed') => {
  statusUpdatingId.value = p.id;
  try {
    const res = await apiClient.patch(`/subsidies/${p.id}/status`, { status });
    await toast(res.data?.message || `Program marked ${status}.`, 'success');
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to update program status.', 'danger');
  } finally {
    statusUpdatingId.value = null;
  }
};

const openRestock = (p: SubsidyProgramRow) => {
  activeProgram.value = p;
  restockQty.value = null;
  restockQtySecondary.value = null;
  restockOpen.value = true;
};

const submitRestock = async () => {
  if (!activeProgram.value || !(Number(restockQty.value) >= 0.01)) return;
  const remarks = await promptAuditRemarks({
    header: 'Justify warehouse delivery',
    message: 'Explain this stock delivery for the audit trail.',
  });
  if (!remarks) return;
  savingRestock.value = true;
  try {
    const bagsMode = isSeedWithBags(activeProgram.value);
    const res = await apiClient.post(`/subsidies/${activeProgram.value.id}/restock`, {
      quantity_added: Number(restockQty.value),
      bags_added: bagsMode ? Number(restockQty.value) : undefined,
      secondary_quantity_added: bagsMode
        ? undefined
        : (Number(restockQtySecondary.value) > 0 ? Number(restockQtySecondary.value) : undefined),
      audit_remarks: remarks,
    });
    await toast(res.data?.message || 'Delivery logged.', 'success');
    restockOpen.value = false;
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to log delivery.', 'danger');
  } finally {
    savingRestock.value = false;
  }
};

const openSettings = (p: SubsidyProgramRow) => {
  activeProgram.value = p;
  settingsUnit.value = p.unit_of_measurement || 'Bags';
  settingsReorder.value = p.reorder_level ?? null;
  settingsReorderSecondary.value = p.secondary_reorder_level ?? null;
  settingsOpen.value = true;
};

const submitSettings = async () => {
  if (!activeProgram.value) return;
  const remarks = await promptAuditRemarks({
    header: 'Justify stock settings change',
    message: 'Explain why subsidy stock settings are being updated.',
  });
  if (!remarks) return;
  savingSettings.value = true;
  try {
    const res = await apiClient.patch(`/subsidies/${activeProgram.value.id}/config`, {
      unit_of_measurement: activeProgram.value.item_type ? undefined : (settingsUnit.value.trim() || undefined),
      reorder_level: settingsReorder.value,
      secondary_reorder_level: activeProgram.value.secondary_unit ? settingsReorderSecondary.value : undefined,
      audit_remarks: remarks,
    });
    await toast(res.data?.message || 'Stock settings updated.', 'success');
    settingsOpen.value = false;
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to update settings.', 'danger');
  } finally {
    savingSettings.value = false;
  }
};

const openVarieties = (p: SubsidyProgramRow) => {
  activeProgram.value = p;
  const existing = p.varieties ?? [];
  varietyRows.value = existing.length
    ? existing.map((v) => ({
      variety_name: v.variety_name,
      quantity: Number(v.total_quantity),
      target_fca: v.target_fca || '',
      target_barangays: [...(v.target_barangays ?? [])],
    }))
    : [blankVariety()];
  varietiesOpen.value = true;
};

const submitVarieties = async () => {
  if (!activeProgram.value) return;
  const filled = varietyPayload(varietyRows.value);
  if (!filled.length) {
    await toast('Add at least one variety with a name and quantity.', 'warning');
    return;
  }
  const remarks = await promptAuditRemarks({
    header: 'Justify variety breakdown',
    message: 'Explain why this variety breakdown is being applied.',
  });
  if (!remarks) return;
  savingVarieties.value = true;
  try {
    const seedBags = activeProgram.value.item_type === 'seed';
    const res = await apiClient.put(`/subsidies/${activeProgram.value.id}/varieties`, {
      varieties: filled.map((row) => ({
        ...row,
        unit: seedBags ? 'bags' : undefined,
      })),
      audit_remarks: remarks,
    });
    await toast(res.data?.message || 'Varieties saved.', 'success');
    varietiesOpen.value = false;
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to save varieties.', 'danger');
  } finally {
    savingVarieties.value = false;
  }
};

onMounted(() => {
  fetchPrograms();
  fetchFcas();
  window.addEventListener('akap:refresh', fetchPrograms);
});
onBeforeUnmount(() => window.removeEventListener('akap:refresh', fetchPrograms));
</script>

<style scoped>
.page-bg { --background: #f4f5f8; }
.shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0.75rem 1rem 2rem;
}
.create-btn {
  --background: #1a4731;
  --color: #fff;
  --border-color: #1a4731;
  --color-activated: #1a4731;
  text-transform: none;
  font-weight: 800;
  margin: 0;
}
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: flex-end;
}
.outline-btn {
  --background: #fff;
  --color: #1a4731;
  --border-color: #1a4731;
  --border-width: 1px;
  --border-style: solid;
}
.center-actions { justify-content: center; }
.section-gap { margin-top: 1rem; }
.fca-add-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
.fca-add-input { flex: 1; }
.fca-list { list-style: none; margin: 0; padding: 0; }
.fca-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid #e2e8f0;
  color: #0f172a;
}
.fca-list .inactive { color: #94a3b8; text-decoration: line-through; }
.fca-toggle {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  color: #1a4731;
}
.fca-empty { color: #64748b; }
.center-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}
.center-state.error { color: #b91c1c; }
.empty-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem 1.25rem;
  text-align: center;
}
.empty-panel h2 {
  margin: 0;
  color: #1a4731;
  font-size: 1.1rem;
  font-weight: 800;
}
.empty-panel p {
  color: #64748b;
  margin: 0.5rem 0 1rem;
}
.table-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.status-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem 0;
}
.status-tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
}
.status-tab:hover { background: #f8fafc; }
.status-tab.active {
  background: #e8f5e9;
  border-color: #c8e6c9;
  color: #1e7e34;
}
.tab-count {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 0 0.4rem;
  border-radius: 999px;
  min-width: 1.25rem;
  text-align: center;
}
.status-tab.active .tab-count {
  background: #c8e6c9;
  color: #1e7e34;
}
.table-tools {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  align-items: center;
  padding: 0.75rem 0.85rem 0.85rem;
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;
  max-width: 28rem;
}
.search-wrap ion-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: #94a3b8;
  pointer-events: none;
}
.name-search, .tool-select {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.48rem 0.7rem;
  font-size: 0.88rem;
  background: #fff;
  font-family: inherit;
  color: #0f172a;
}
.name-search {
  width: 100%;
  padding-left: 2.15rem;
}
.tool-select {
  min-width: 150px;
  color: #334155;
}
.table-scroll { overflow: auto; }
.program-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}
.program-table th, .program-table td {
  text-align: left;
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
  font-size: 0.86rem;
}
.program-table th {
  background: #f8fafc;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}
.program-table tbody tr:hover { background: #fafdfa; }
.program-name {
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}
.row-meta {
  margin-top: 0.22rem;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.4;
}
.crop-cell { color: #334155; font-weight: 500; white-space: nowrap; }
.scope-cell {
  font-size: 0.82rem;
  color: #475569;
  max-width: 10rem;
}
.empty-row { text-align: center; color: #64748b; padding: 1.4rem !important; }
.status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.status-pill.draft { background: #e3f2fd; color: #1565c0; }
.status-pill.active { background: #e8f5e9; color: #1e7e34; }
.status-pill.completed { background: #f1f5f9; color: #475569; }
.inv-cell { min-width: 11rem; }
.inv-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.inv-qty {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.86rem;
}
.stock-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}
.progress-track {
  height: 6px;
  margin-top: 0.4rem;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2e7d32, #1a4731);
  border-radius: 999px;
  min-width: 0;
  transition: width 0.25s ease;
}
.inv-sub {
  margin-top: 0.28rem;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}
.col-actions { text-align: right; width: 1%; }
.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  white-space: nowrap;
}
.open-btn {
  --background: #1a4731;
  --color: #fff;
  --padding-start: 0.7rem;
  --padding-end: 0.7rem;
  text-transform: none;
  font-weight: 700;
  margin: 0;
  height: 32px;
}
.activate-btn {
  --border-color: #1e7e34;
  --color: #1e7e34;
  --padding-start: 0.7rem;
  --padding-end: 0.7rem;
  text-transform: none;
  font-weight: 700;
  margin: 0;
  height: 32px;
}
.more-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.more-btn:hover {
  background: #f8fafc;
  color: #1a4731;
  border-color: #cbd5e1;
}
.more-btn ion-icon { font-size: 1.05rem; }
.catalog-hint {
  margin: 0.35rem 0.9rem 0.6rem;
  font-size: 0.78rem;
  color: #1a4731;
  background: #eef7f0;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
}
.inv-qty-secondary { color: #475569; font-weight: 600; }
.section-label {
  margin: 1rem 0 0.35rem 0.9rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}
.brgy-picker-wrap {
  margin: 0 0.9rem 0.75rem;
}
.modal-program { font-weight: 800; color: #1a4731; font-size: 1.15rem; margin: 0 0 4px; }
.modal-hint { color: #64748b; font-size: 0.85rem; margin: 4px 0 1rem; }
.modal-warn {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  color: #92400e;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  font-size: 0.82rem;
  margin: 0 0 0.85rem;
  line-height: 1.4;
}
.date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
@media (max-width: 560px) {
  .date-row { grid-template-columns: 1fr; }
}
.modal-input { --background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 0.8rem; }
.legacy-note {
  margin-top: 1.25rem;
  font-size: 0.78rem;
  color: #94a3b8;
}
.legacy-note a { color: #1a4731; font-weight: 700; }
.form-error {
  color: #b91c1c;
  font-size: 0.88rem;
  margin: 0.75rem 0 0;
}
.save-btn {
  --background: #1a4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 1rem;
}
@media (max-width: 720px) {
  .search-wrap { max-width: none; }
  .tool-select { flex: 1; min-width: 140px; }
}
</style>

<style>
.prog-more-pop .ctx { padding: 4px 0; min-width: 15.5rem; }
.prog-more-pop .ctx ion-item { --min-height: 40px; font-size: 0.88rem; }
.prog-more-pop .ctx ion-icon { color: #1a4731; font-size: 1.05rem; }
.prog-more-pop .ctx .warn ion-icon,
.prog-more-pop .ctx .warn ion-label { color: #b45309; }
.variety-edit-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
.variety-edit-name { flex: 1; }
.variety-edit-qty { width: 100px; }
.variety-remove-btn { background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; padding: 0.35rem 0.6rem; cursor: pointer; font-size: 0.85rem; }
.variety-add-btn { text-transform: none; margin-bottom: 0.5rem; }
</style>

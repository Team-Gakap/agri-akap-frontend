<template>
  <ion-page>
    <AppHeader />

    <ion-content class="rpt-content">
      <div class="print-only letterhead">
        <MaoFormHeader
          :show-barangay="false"
          office-title="Municipal Agriculture Office"
          title="Crop Production Report (Standing Data)"
        >
          <template #subtitle>
            <p class="lh-meta">
              Generated: {{ new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) }}
            </p>
          </template>
        </MaoFormHeader>
      </div>

      <div class="rpt-shell">
        <StandingCropReportGrid />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { IonPage, IonContent } from '@ionic/vue';
import MaoFormHeader from '@/components/MaoFormHeader.vue';
import StandingCropReportGrid from '@/views/Admin/Reports/StandingCropReportGrid.vue';
</script>

<style scoped>
.rpt-content { --background: #eef1f4; }
.rpt-shell { display: flex; flex-direction: column; height: 100%; padding: 0.75rem 1rem 1rem; gap: 0.65rem; }
.lh-meta { margin: 0; font-size: 0.85rem; }
.print-only { display: none; }
@media print {
  .print-only { display: block !important; }
  .rpt-shell, .rpt-content {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    padding: 0;
  }
  .letterhead { text-align: center; margin-bottom: 1rem; border-bottom: 2px solid #1a4731; padding-bottom: 0.75rem; }
  .lh-meta { margin: 2px 0 0; font-size: 0.78rem; color: #64748b; }
}
</style>

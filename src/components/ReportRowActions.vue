<template>
  <div class="report-row-actions no-print">
    <!-- Compact inline chips -->
    <template v-if="variant === 'inline'">
      <button
        v-if="canView"
        type="button"
        class="act-chip"
        title="View evidence"
        aria-label="View evidence"
        @click="$emit('view')"
      >
        <ion-icon :icon="eyeOutline"></ion-icon>
        <span>View</span>
      </button>
      <button
        v-if="canEdit"
        type="button"
        class="act-chip"
        title="Edit record"
        aria-label="Edit record"
        @click="$emit('edit')"
      >
        <ion-icon :icon="createOutline"></ion-icon>
        <span>Edit</span>
      </button>
      <button
        v-if="canRemove"
        type="button"
        class="act-chip danger"
        :title="destructiveTitle"
        :aria-label="destructiveLabel"
        @click="$emit('remove')"
      >
        <ion-icon :icon="destructiveIcon"></ion-icon>
        <span>{{ destructiveLabel }}</span>
      </button>
    </template>

    <!-- Overflow kebab for crowded tables -->
    <template v-else>
      <button
        type="button"
        class="more-btn"
        :id="triggerId"
        title="More actions"
        aria-label="More actions"
      >
        <ion-icon :icon="ellipsisVertical"></ion-icon>
      </button>
      <ion-popover
        :trigger="triggerId"
        trigger-action="click"
        side="left"
        :dismiss-on-select="true"
      >
        <ion-content>
          <ion-list lines="none" class="ctx">
            <ion-item v-if="canView" button :detail="false" @click="$emit('view')">
              <ion-icon :icon="eyeOutline" slot="start"></ion-icon>
              <ion-label>View evidence</ion-label>
            </ion-item>
            <ion-item v-if="canEdit" button :detail="false" @click="$emit('edit')">
              <ion-icon :icon="createOutline" slot="start"></ion-icon>
              <ion-label>Edit record</ion-label>
            </ion-item>
            <ion-item
              v-if="canRemove"
              button
              :detail="false"
              class="danger"
              @click="$emit('remove')"
            >
              <ion-icon :icon="destructiveIcon" slot="start"></ion-icon>
              <ion-label color="danger">{{ destructiveLabel }} record</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-popover>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonContent, IonIcon, IonItem, IonLabel, IonList, IonPopover } from '@ionic/vue';
import {
  createOutline,
  ellipsisVertical,
  eyeOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons';

const props = withDefaults(defineProps<{
  canEdit?: boolean;
  canRemove?: boolean;
  canView?: boolean;
  destructiveMode?: 'remove' | 'void';
  variant?: 'inline' | 'menu';
  rowId?: string;
}>(), {
  canEdit: true,
  canRemove: true,
  canView: false,
  destructiveMode: 'remove',
  variant: 'inline',
  rowId: '',
});

defineEmits<{
  edit: [];
  remove: [];
  view: [];
}>();

const isVoid = computed(() => props.destructiveMode === 'void');
const destructiveLabel = computed(() => (isVoid.value ? 'Void' : 'Remove'));
const destructiveTitle = computed(() =>
  isVoid.value
    ? 'Void record (requires audit justification)'
    : 'Remove record',
);
const destructiveIcon = computed(() => (isVoid.value ? warningOutline : trashOutline));

const fallbackId = ref(`f${Math.random().toString(36).slice(2, 10)}`);
const triggerId = computed(() => `rpt-act-${props.rowId || fallbackId.value}`);
</script>

<style scoped>
.report-row-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}

.act-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  height: 32px;
  padding: 0 0.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}
.act-chip ion-icon { font-size: 0.95rem; }
.act-chip:hover {
  border-color: #1a4731;
  color: #1a4731;
  background: #f8fafc;
}
.act-chip.danger {
  border-color: #fecaca;
  color: #b91c1c;
}
.act-chip.danger:hover {
  border-color: #b91c1c;
  background: #fef2f2;
  color: #991b1b;
}

.more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  padding: 0;
}
.more-btn ion-icon { font-size: 1.1rem; }
.more-btn:hover { background: #f1f5f9; color: #1a4731; }

.ctx { padding: 4px 0; }
.ctx ion-item { --min-height: 38px; font-size: 0.88rem; }
.ctx ion-icon { color: #1a4731; }
.ctx .danger ion-icon { color: #b91c1c; }
</style>

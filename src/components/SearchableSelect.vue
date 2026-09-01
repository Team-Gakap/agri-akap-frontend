<template>
  <div
    ref="root"
    class="ss"
    :class="[`ss-${variant}`, { open: isOpen, disabled, 'ss-wrap-selected': wrapSelected && !!modelValue }]"
  >
    <label v-if="label" class="ss-label" :class="{ req: required }">{{ label }}</label>
    <div class="ss-control" @mousedown.prevent="focusControl">
      <div
        v-if="wrapSelected && modelValue && !isOpen"
        class="ss-value-wrap"
        tabindex="0"
        role="button"
        @keydown.enter.prevent="openMenu"
        @keydown.space.prevent="openMenu"
      >{{ modelValue }}</div>
      <input
        v-else
        ref="inputEl"
        type="text"
        class="ss-input"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="inputText"
        autocomplete="off"
        spellcheck="false"
        @focus="openMenu"
        @input="onInput"
        @keydown="onKey"
      />
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="ss-clear"
        tabindex="-1"
        aria-label="Clear"
        @mousedown.prevent="clear"
      >×</button>
      <span class="ss-caret" aria-hidden="true">▾</span>
    </div>

    <Teleport to="body">
      <ul
        v-if="isOpen"
        class="ss-menu"
        :style="menuStyle"
        role="listbox"
      >
        <li
          v-if="allowEmpty"
          class="ss-option ss-empty-opt"
          :class="{ active: highlight === -1 }"
          role="option"
          @mousedown.prevent="select('')"
        >{{ emptyLabel }}</li>
        <li
          v-for="(opt, i) in filtered"
          :key="opt"
          class="ss-option"
          :class="{ active: i === highlight, selected: opt === modelValue }"
          role="option"
          @mousedown.prevent="select(opt)"
        >{{ opt }}</li>
        <li v-if="!filtered.length" class="ss-none">{{ emptyResultsLabel }}</li>
      </ul>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  modelValue?: string;
  options: string[];
  label?: string;
  placeholder?: string;
  emptyLabel?: string;
  allowEmpty?: boolean;
  required?: boolean;
  disabled?: boolean;
  variant?: 'form' | 'filter';
  wrapSelected?: boolean;
  emptyResultsLabel?: string;
}>(), {
  modelValue: '',
  label: '',
  placeholder: 'Search barangay…',
  emptyLabel: 'All barangays',
  allowEmpty: false,
  required: false,
  disabled: false,
  variant: 'form',
  wrapSelected: false,
  emptyResultsLabel: 'No matches',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

const root = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const query = ref('');
const highlight = ref(0);
const menuStyle = ref<Record<string, string>>({});

const inputText = computed(() => (isOpen.value ? query.value : (props.modelValue || '')));

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((o) => o.toLowerCase().includes(q));
});

const placeMenu = () => {
  const el = root.value?.querySelector('.ss-control') as HTMLElement | null;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const minWidth = Math.max(rect.width, props.wrapSelected ? 360 : 320);
  const maxWidth = Math.min(window.innerWidth - 16, props.wrapSelected ? 560 : 480);
  const width = Math.min(Math.max(minWidth, rect.width), maxWidth);
  let left = rect.left;
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - width - 8);
  }
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 240 && rect.top > spaceBelow;
  menuStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    width: `${width}px`,
    zIndex: '40000',
    ...(openUp
      ? { bottom: `${window.innerHeight - rect.top + 4}px`, top: 'auto' }
      : { top: `${rect.bottom + 4}px` }),
  };
};

const openMenu = () => {
  if (props.disabled) return;
  isOpen.value = true;
  query.value = '';
  highlight.value = props.allowEmpty ? -1 : 0;
  placeMenu();
  nextTick(() => {
    inputEl.value?.focus();
    if (!props.wrapSelected || !props.modelValue) {
      inputEl.value?.select();
    }
  });
};

const closeMenu = () => {
  isOpen.value = false;
  query.value = '';
};

const focusControl = () => {
  if (props.disabled) return;
  if (props.wrapSelected && props.modelValue && !isOpen.value) {
    openMenu();
    return;
  }
  inputEl.value?.focus();
  openMenu();
};

const focusInput = focusControl;

const select = (value: string) => {
  emit('update:modelValue', value);
  emit('change', value);
  closeMenu();
};

const clear = () => {
  emit('update:modelValue', '');
  emit('change', '');
  query.value = '';
  inputEl.value?.focus();
  openMenu();
};

const onInput = (e: Event) => {
  query.value = (e.target as HTMLInputElement).value;
  highlight.value = filtered.value.length ? 0 : (props.allowEmpty ? -1 : 0);
  if (!isOpen.value) openMenu();
  placeMenu();
};

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!isOpen.value) openMenu();
    const max = filtered.value.length - 1;
    const min = props.allowEmpty ? -1 : 0;
    highlight.value = highlight.value >= max ? min : highlight.value + 1;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const max = filtered.value.length - 1;
    const min = props.allowEmpty ? -1 : 0;
    highlight.value = highlight.value <= min ? max : highlight.value - 1;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (highlight.value === -1 && props.allowEmpty) select('');
    else if (filtered.value[highlight.value]) select(filtered.value[highlight.value]);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeMenu();
  }
};

const onDocDown = (e: MouseEvent) => {
  const t = e.target as Node;
  if (root.value?.contains(t)) return;
  const menu = document.querySelector('.ss-menu');
  if (menu?.contains(t)) return;
  closeMenu();
};

watch(() => props.options, () => { if (isOpen.value) placeMenu(); });

onMounted(() => {
  document.addEventListener('mousedown', onDocDown);
  window.addEventListener('resize', closeMenu);
  window.addEventListener('scroll', closeMenu, true);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', onDocDown);
  window.removeEventListener('resize', closeMenu);
  window.removeEventListener('scroll', closeMenu, true);
});
</script>

<style scoped>
.ss { position: relative; width: 100%; min-width: 0; }
.ss.disabled { opacity: 0.6; pointer-events: none; }

.ss-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.35px;
  color: #1a4731;
  text-transform: uppercase;
  margin-bottom: 6px;
  line-height: 1.2;
  min-height: 14px;
}
.ss-label.req::after { content: ' *'; color: #c0392b; }

.ss-filter .ss-label {
  font-size: 0.7rem;
  color: #64748b;
  margin-bottom: 3px;
}

.ss-control {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1.5px solid #94a3b8;
  border-radius: 6px;
  background: #fff;
  min-height: 42px;
  height: auto;
  padding: 0 8px 0 12px;
  cursor: text;
  box-sizing: border-box;
  overflow: visible;
}
.ss-filter .ss-control {
  border: 1px solid #c5ccd4;
  border-radius: 6px;
  min-height: 32px;
  height: 32px;
}
.ss.open .ss-control {
  border-color: #1a4731;
  outline: 2px solid rgba(26, 71, 49, 0.18);
  outline-offset: 1px;
  box-shadow: none;
}

.ss-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #0f172a;
  font-family: inherit;
  padding: 8px 0;
  overflow: visible;
  text-overflow: clip;
}
.ss-filter .ss-input { font-size: 0.82rem; color: #0f172a; }

.ss-clear {
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}
.ss-caret { color: #64748b; font-size: 10px; flex-shrink: 0; }

.ss-wrap-selected .ss-control {
  align-items: flex-start;
  min-height: 42px;
  height: auto;
  padding-top: 8px;
  padding-bottom: 8px;
}
.ss-value-wrap {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.35;
  color: #0f172a;
  white-space: normal;
  word-break: break-word;
  cursor: text;
  padding: 0;
}
</style>

<style>
/* Teleported menu — unscoped so body portal inherits readable full-name wrapping */
.ss-menu {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
}
.ss-option {
  padding: 8px 12px;
  font-size: 0.88rem;
  line-height: 1.35;
  color: #0f172a;
  cursor: pointer;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
}
.ss-option:hover,
.ss-option.active { background: #e8f5e9; }
.ss-option.selected { font-weight: 700; color: #1a4731; }
.ss-empty-opt { color: #64748b; font-style: italic; }
.ss-none {
  padding: 10px 12px;
  color: #94a3b8;
  font-size: 0.82rem;
  font-style: italic;
}
</style>

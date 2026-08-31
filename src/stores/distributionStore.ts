import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Allocation preview returned by POST /distributions/verify. Holds the
 * eligibility snapshot handed from the Scan tab to the Release view.
 */
export interface ReleaseContext {
  farmer_id: string;
  program_id: string;
  farmer_name: string;
  mobile_number?: string | null;
  item_released: string;
  seed_class?: string | null;
  item_type?: string | null;
  unit: string;
  total_farm_size: number;
  eligible_size: number;
  quantity: number;
  inventory_remaining: number;
  /** Second unit bucket for dual-unit catalog items (e.g. Hybrid Seed: kg + bags). */
  unit_secondary?: string | null;
  quantity_secondary?: number | null;
  inventory_remaining_secondary?: number | null;
  plot_lat?: number | null;
  plot_long?: number | null;
  beneficiary_id?: string | null;
  rsbsa_no?: string | null;
  source?: 'subsidy' | 'program';
  /** True when the context was stashed offline (verify was skipped). */
  offline: boolean;
}

export const useDistributionStore = defineStore('distribution', () => {
  const context = ref<ReleaseContext | null>(null);

  function setContext(ctx: ReleaseContext) {
    context.value = ctx;
  }

  function clear() {
    context.value = null;
  }

  return { context, setContext, clear };
});

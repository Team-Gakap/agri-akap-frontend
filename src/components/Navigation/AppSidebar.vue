<template>
  <ion-menu :content-id="contentId" type="overlay" class="akap-menu">
    <ion-header class="brand-header">
      <ion-toolbar class="brand-toolbar">
        <div class="brand">
          <img class="brand-seal" src="@/assets/images/echague-logo.png" alt="MAO Echague seal" />
          <div class="brand-copy">
            <span class="brand-name">AGRI-AKAP</span>
            <span class="brand-sub">Municipal Agriculture Office</span>
            <span class="tier-pill">{{ tierLabel }}</span>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <nav class="nav-scroll">
        <template v-for="group in groups" :key="group.key">
          <p class="nav-group-label">{{ group.label }}</p>

          <ion-accordion-group
            v-if="group.accordion"
            :value="accordionOpen(group.accordion.key) ? group.accordion.key : ''"
            @ionChange="onAccordion($event, group.accordion.key)"
          >
            <ion-accordion :value="group.accordion.key">
              <ion-item
                slot="header"
                lines="none"
                class="nav-item accordion-head"
                :class="{ active: isAccordionActive(group.accordion) }"
              >
                <ion-icon slot="start" :icon="group.accordion.icon" class="nav-icon"></ion-icon>
                <ion-label class="nav-label">{{ group.accordion.title }}</ion-label>
              </ion-item>
              <div slot="content" class="nav-children">
                <ion-menu-toggle :auto-hide="false" v-for="child in group.accordion.children" :key="child.url">
                  <ion-item
                    router-direction="root"
                    :router-link="child.url"
                    lines="none"
                    :detail="false"
                    class="nav-item child"
                    :class="{ active: isActive(child.url, true) }"
                  >
                    <ion-icon slot="start" :icon="child.icon || chevronForwardOutline" class="nav-icon child-icon"></ion-icon>
                    <ion-label class="nav-label">{{ child.title }}</ion-label>
                    <span v-if="child.badge === 'pests' && pests > 0" class="count-pill">{{ pests }}</span>
                  </ion-item>
                </ion-menu-toggle>
              </div>
            </ion-accordion>
          </ion-accordion-group>

          <ion-menu-toggle :auto-hide="false" v-for="item in group.items" :key="item.url">
            <ion-item
              button
              router-direction="root"
              :router-link="item.url"
              lines="none"
              :detail="false"
              class="nav-item"
              :class="{ active: isActive(item.url, item.exact) }"
            >
              <ion-icon slot="start" :icon="item.icon" class="nav-icon"></ion-icon>
              <ion-label class="nav-label">{{ item.title }}</ion-label>
              <span v-if="item.badge === 'pests' && pests > 0" class="count-pill">{{ pests }}</span>
            </ion-item>
          </ion-menu-toggle>
        </template>
      </nav>
    </ion-content>

    <ion-footer class="session-footer">
      <div class="session-row">
        <span class="avatar">{{ initials }}</span>
        <div class="session-copy">
          <strong>{{ displayName }}</strong>
          <span>{{ roleBadge }} • {{ syncStore.online ? 'Online' : 'Offline' }}</span>
        </div>
      </div>
      <ion-button fill="outline" class="logout-btn" @click="handleLogout">
        <ion-icon slot="start" :icon="logOutOutline"></ion-icon>
        Logout
      </ion-button>
    </ion-footer>
  </ion-menu>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonMenu, IonHeader, IonToolbar, IonContent, IonFooter, IonItem, IonLabel,
  IonIcon, IonMenuToggle, IonAccordionGroup, IonAccordion, IonButton,
} from '@ionic/vue';
import {
  gridOutline, peopleOutline, idCardOutline, cubeOutline,
  chatboxEllipsesOutline, cloudOutline, documentTextOutline,
  homeOutline, leafOutline, flowerOutline, basketOutline, bugOutline, thunderstormOutline,
  shieldCheckmarkOutline, chatbubblesOutline, briefcaseOutline, logOutOutline,
  chevronForwardOutline, documentsOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { usePortalAlerts } from '@/composables/usePortalAlerts';

export type PortalKind = 'admin' | 'barangay' | 'superadmin';

const props = defineProps<{ portal: PortalKind }>();

const route = useRoute();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const { pests, fetchAlerts } = usePortalAlerts();

const contentId = computed(() => ({
  admin: 'admin-content',
  barangay: 'brgy-content',
  superadmin: 'superadmin-content',
}[props.portal]));

const tierLabel = computed(() => ({
  admin: 'Central Admin',
  barangay: 'Barangay Portal',
  superadmin: 'System Governance',
}[props.portal]));

const displayName = computed(() => authStore.userName || 'MAO User');
const initials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});
const roleBadge = computed(() => {
  switch (authStore.userRole) {
    case 'super_admin': return 'Superadmin';
    case 'admin': return 'MAO Lead Admin';
    case 'barangay_official': return 'Barangay Encoder';
    default: return 'Staff';
  }
});

interface NavItem {
  title: string;
  url: string;
  icon: string;
  exact?: boolean;
  badge?: 'pests';
}
interface NavAccordion {
  key: string;
  title: string;
  icon: string;
  prefix: string;
  children: NavItem[];
}
interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
  accordion?: NavAccordion;
}

const reportChildrenAdmin: NavItem[] = [
  { title: 'Subsidy Distribution', url: '/admin/reports/subsidies', icon: cubeOutline },
  { title: 'Crop Production', url: '/admin/reports/crop-production', icon: leafOutline },
  { title: 'Standing Crop', url: '/admin/reports/standing-crop', icon: flowerOutline },
  { title: 'Pest Surveillance', url: '/admin/reports/pest-surveillance', icon: bugOutline, badge: 'pests' },
  { title: 'Damage & Calamity', url: '/admin/reports/damage-calamity', icon: thunderstormOutline },
];

const reportChildrenBrgy: NavItem[] = [
  { title: 'Crop Production', url: '/brgy/reports/crop-production', icon: leafOutline },
  { title: 'Standing Crop', url: '/brgy/reports/standing-crop', icon: flowerOutline },
  { title: 'Pest Surveillance', url: '/brgy/reports/pest-surveillance', icon: bugOutline, badge: 'pests' },
  { title: 'Damage & Calamity', url: '/brgy/reports/damage-calamity', icon: thunderstormOutline },
  { title: 'Subsidy Distribution', url: '/brgy/reports/subsidies', icon: documentsOutline },
];

const cropChildren: NavItem[] = [
  { title: 'Planting Records', url: '/brgy/planting-ledger', icon: leafOutline },
  { title: 'Standing Crops', url: '/brgy/standing-crop', icon: flowerOutline },
  { title: 'Harvest Records', url: '/brgy/harvesting', icon: basketOutline },
];

const groups = computed<NavGroup[]>(() => {
  if (props.portal === 'superadmin') {
    return [
      {
        key: 'gov',
        label: 'Governance',
        items: [
          { title: 'Dashboard', url: '/superadmin/dashboard', icon: homeOutline, exact: true },
          { title: 'User Accounts', url: '/superadmin/users', icon: peopleOutline },
          { title: 'Security', url: '/superadmin/security', icon: shieldCheckmarkOutline },
          { title: 'SMS Gateway', url: '/superadmin/sms', icon: chatbubblesOutline },
        ],
      },
      {
        key: 'audit',
        label: 'Audit',
        items: [
          { title: 'Audit Logs', url: '/superadmin/audit-logs', icon: documentTextOutline },
          { title: 'MAO Operations', url: '/admin/dashboard', icon: briefcaseOutline, exact: true },
        ],
      },
    ];
  }

  if (props.portal === 'barangay') {
    return [
      {
        key: 'core',
        label: 'Core Operations',
        items: [
          { title: 'Dashboard', url: '/brgy/dashboard', icon: gridOutline, exact: true },
          { title: 'Farmers', url: '/brgy/farmers', icon: peopleOutline },
        ],
      },
      {
        key: 'field',
        label: 'Field Encoding',
        items: [
          { title: 'Pest Incidents', url: '/brgy/pest-monitoring', icon: bugOutline, badge: 'pests' },
          { title: 'Damage Assessments', url: '/brgy/calamity-assessment', icon: thunderstormOutline },
        ],
        accordion: {
          key: 'crops',
          title: 'Crop Records',
          icon: leafOutline,
          prefix: '',
          children: cropChildren,
        },
      },
      {
        key: 'reports',
        label: 'Statutory Audit & Reports',
        items: [],
        accordion: {
          key: 'reports',
          title: 'Executive Reports',
          icon: documentTextOutline,
          prefix: '/brgy/reports',
          children: reportChildrenBrgy,
        },
      },
    ];
  }

  const adminGroups: NavGroup[] = [
    {
      key: 'core',
      label: 'Core Operations',
      items: [
        { title: 'Command Center', url: '/admin/dashboard', icon: gridOutline, exact: true },
        { title: 'Farmer Registry (RSBSA)', url: '/admin/farmers', icon: peopleOutline },
        { title: 'ID Card Production', url: '/admin/id-issuance', icon: idCardOutline },
        { title: 'Subsidy Campaigns', url: '/admin/subsidies', icon: cubeOutline },
      ],
    },
    {
      key: 'intel',
      label: 'Intelligence & Field',
      items: [
        { title: 'Outreach & SMS Broadcast', url: '/admin/broadcasts', icon: chatboxEllipsesOutline },
        { title: 'Agro-Climate Monitor', url: '/admin/weather', icon: cloudOutline },
      ],
    },
    {
      key: 'reports',
      label: 'Statutory Audit & Reports',
      items: [],
      accordion: {
        key: 'reports',
        title: 'Executive Reports',
        icon: documentTextOutline,
        prefix: '/admin/reports',
        children: reportChildrenAdmin,
      },
    },
  ];

  if (authStore.isSuperAdmin) {
    adminGroups.push({
      key: 'gov',
      label: 'Governance',
      items: [
        { title: 'System Console', url: '/superadmin/dashboard', icon: shieldCheckmarkOutline, exact: true },
      ],
    });
  }

  return adminGroups;
});

const expanded = ref<Record<string, boolean>>({});

function isAccordionActive(acc: NavAccordion) {
  if (acc.prefix && route.path.startsWith(acc.prefix)) return true;
  return acc.children.some((c) => isActive(c.url, true));
}

function accordionOpen(key: string) {
  return !!expanded.value[key];
}

function onAccordion(e: CustomEvent, key: string) {
  expanded.value[key] = e.detail.value === key;
}

function isActive(url: string, exact = false) {
  if (exact) return route.path === url;
  if (url === '/admin/dashboard' || url === '/brgy/dashboard' || url === '/superadmin/dashboard') {
    return route.path === url;
  }
  if (url === '/admin/farmers') {
    return route.path === url || route.path.startsWith('/admin/farmers/');
  }
  if (url === '/admin/subsidies') {
    return route.path === url || route.path.startsWith('/admin/subsidies/');
  }
  if (url === '/admin/weather') {
    return route.path === url || route.path.startsWith('/admin/weather/');
  }
  return route.path === url || route.path.startsWith(url + '/');
}

watch(() => route.path, () => {
  groups.value.forEach((g) => {
    if (g.accordion && isAccordionActive(g.accordion)) {
      expanded.value[g.accordion.key] = true;
    }
  });
}, { immediate: true });

const handleLogout = () => authStore.logout();

onMounted(() => {
  void fetchAlerts();
});
</script>

<style scoped>
.akap-menu {
  --background: #ffffff;
  border-right: 1px solid #E2E8F0;
}
.brand-toolbar {
  --background: #ffffff;
  --color: #0f172a;
  --border-width: 0 0 1px 0;
  --border-color: #E2E8F0;
  --min-height: 76px;
  --padding-start: 12px;
  --padding-end: 12px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.35rem 0;
}
.brand-seal {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}
.brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}
.brand-name {
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: #0f172a;
}
.brand-sub {
  font-size: 0.72rem;
  font-weight: 500;
  color: #64748b;
}
.tier-pill {
  margin-top: 0.25rem;
  align-self: flex-start;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1A4731;
  background: #E8F5E9;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
}

ion-content { --background: #ffffff; }

.nav-scroll { padding: 0.45rem 0 1rem; }
.nav-group-label {
  margin: 0.65rem 0 0.2rem;
  padding: 0.35rem 0.9rem 0.2rem;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.nav-item {
  --background: transparent;
  --border-radius: 10px;
  --min-height: 44px;
  --color: #334155;
  margin: 2px 10px;
  border-left: 3px solid transparent;
  transition: background 0.15s ease, color 0.15s ease;
}
.nav-item:hover {
  --background: #E8F5E9;
  --color: #064e3b;
}
.nav-icon { color: #64748b; font-size: 20px; }
.nav-label { font-size: 0.86rem; font-weight: 600; color: #334155; }
.nav-item.active {
  --background: #E8F5E9;
  border-left-color: #1A4731;
}
.nav-item.active .nav-label,
.nav-item.active .nav-icon {
  color: #1A4731;
  font-weight: 800;
}

.nav-children {
  background: #F8FAFC;
  border-left: 2px solid #d1e0d6;
  margin: 0 10px 6px 22px;
  border-radius: 0 0 8px 8px;
  padding: 2px 0 4px;
}
.nav-item.child { margin: 1px 4px; --min-height: 38px; --background: transparent; border-left-width: 0; }
.child-icon { font-size: 16px; color: #94a3b8; }
.nav-item.child .nav-label { font-size: 0.8rem; font-weight: 500; }
.nav-item.child.active { --background: rgba(26, 71, 49, 0.10); }
.nav-item.child.active .nav-label { font-weight: 800; color: #1A4731; }
.nav-item.child.active .child-icon { color: #1A4731; }

.count-pill {
  font-size: 0.62rem;
  font-weight: 800;
  color: #92400e;
  background: #fef3c7;
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
}

.session-footer {
  border-top: 1px solid #E2E8F0;
  background: #ffffff;
  padding: 0.7rem 0.85rem 0.85rem;
}
.session-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.55rem;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #1A4731;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.session-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}
.session-copy strong {
  font-size: 0.78rem;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-copy span {
  font-size: 0.65rem;
  font-weight: 650;
  color: #64748b;
}
.logout-btn {
  --border-color: #fecaca;
  --color: #b91c1c;
  --border-radius: 10px;
  --padding-start: 10px;
  --padding-end: 10px;
  width: 100%;
  margin: 0;
  text-transform: none;
  font-weight: 700;
  font-size: 0.8rem;
}

@media (max-width: 700px) {
  ion-menu { --width: 56px !important; --max-width: 56px !important; --border: none !important; }
  .brand-copy, .nav-group-label, .nav-label, .count-pill, .session-copy, .logout-btn { display: none !important; }
  .brand { justify-content: center; padding: 0; }
  .brand-toolbar { --min-height: 56px; --padding-start: 0; --padding-end: 0; }
  .nav-item { --padding-start: 0; --inner-padding-end: 0; --min-height: 52px; justify-content: center; margin: 0; border-left-width: 0; }
  .nav-icon { font-size: 22px; margin: 0 auto !important; margin-inline-end: 0 !important; }
  .nav-children { display: none !important; }
  .session-footer { padding: 0.4rem 0; display: flex; justify-content: center; }
  .session-row { margin: 0; }
}
</style>

<template>
  <ion-menu :content-id="contentId" type="overlay" class="akap-menu">
    <ion-header class="brand-header">
      <ion-toolbar class="brand-toolbar">
        <div class="brand">
          <img class="brand-seal" src="@/assets/images/echague-logo.png" alt="MAO Echague seal" />
          <span class="brand-name">AGRI-AKAP</span>
          <span class="tier-tag">{{ tierLabel }}</span>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <nav class="nav-scroll">
        <template v-for="group in groups" :key="group.key">
          <p class="nav-group-label">{{ group.label }}</p>

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

          <ion-menu-toggle :auto-hide="false" v-for="item in (group.trailingItems || [])" :key="'trail-' + item.url">
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
          <strong>{{ shortName }}</strong>
          <span>({{ shortRole }})</span>
        </div>
        <button
          type="button"
          class="logout-icon"
          aria-label="Logout"
          @click="handleLogout"
        >
          <ion-icon :icon="logOutOutline"></ion-icon>
        </button>
      </div>
    </ion-footer>
  </ion-menu>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonMenu, IonHeader, IonToolbar, IonContent, IonFooter, IonItem, IonLabel,
  IonIcon, IonMenuToggle, IonAccordionGroup, IonAccordion,
} from '@ionic/vue';
import {
  gridOutline, peopleOutline, idCardOutline, cubeOutline,
  chatboxEllipsesOutline, cloudOutline, documentTextOutline,
  homeOutline, leafOutline, bugOutline, thunderstormOutline,
  shieldCheckmarkOutline, chatbubblesOutline, briefcaseOutline, logOutOutline,
  chevronForwardOutline, documentsOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import { usePortalAlerts } from '@/composables/usePortalAlerts';

export type PortalKind = 'admin' | 'barangay' | 'superadmin';

const props = defineProps<{ portal: PortalKind }>();

const route = useRoute();
const authStore = useAuthStore();
const { pests, fetchAlerts } = usePortalAlerts();

const contentId = computed(() => ({
  admin: 'admin-content',
  barangay: 'brgy-content',
  superadmin: 'superadmin-content',
}[props.portal]));

const tierLabel = computed(() => ({
  admin: 'Admin',
  barangay: 'Barangay',
  superadmin: 'Governance',
}[props.portal]));

const displayName = computed(() => authStore.userName || 'MAO User');
const initials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});
const shortName = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MAO User';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
});
const shortRole = computed(() => {
  switch (authStore.userRole) {
    case 'super_admin': return 'Superadmin';
    case 'admin': return 'Admin';
    case 'barangay_official': return 'Encoder';
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
  trailingItems?: NavItem[];
}

const reportChildrenAdmin: NavItem[] = [
  { title: 'Subsidy Distribution', url: '/admin/reports/subsidies', icon: cubeOutline },
  { title: 'Crop Production', url: '/admin/reports/crop-production', icon: leafOutline },
  { title: 'Pest Surveillance', url: '/admin/reports/pest-surveillance', icon: bugOutline, badge: 'pests' },
  { title: 'Damage & Calamity', url: '/admin/reports/damage-calamity', icon: thunderstormOutline },
];

const groups = computed<NavGroup[]>(() => {
  if (props.portal === 'superadmin') {
    return [
      {
        key: 'gov',
        label: 'Governance',
        items: [
          { title: 'Dashboard', url: '/superadmin/dashboard', icon: homeOutline, exact: true },
          { title: 'Users', url: '/superadmin/users', icon: peopleOutline },
          { title: 'Security', url: '/superadmin/security', icon: shieldCheckmarkOutline },
          { title: 'SMS', url: '/superadmin/sms', icon: chatbubblesOutline },
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
        key: 'dash',
        label: 'Dashboard',
        items: [
          { title: 'Dashboard', url: '/brgy/dashboard', icon: gridOutline, exact: true },
          { title: 'Farmers', url: '/brgy/farmers', icon: peopleOutline },
        ],
      },
      {
        key: 'ledgers',
        label: 'Field ledgers',
        items: [
          { title: 'Subsidy Claims', url: '/brgy/reports/subsidies', icon: documentsOutline },
          { title: 'Crop Records', url: '/brgy/crop-records', icon: leafOutline },
          { title: 'Pest Reports', url: '/brgy/pest-monitoring', icon: bugOutline, badge: 'pests' },
          { title: 'Disaster Reports', url: '/brgy/calamity-assessment', icon: thunderstormOutline },
        ],
      },
    ];
  }

  const adminOps: NavItem[] = [
    { title: 'Dashboard', url: '/admin/dashboard', icon: gridOutline, exact: true },
    { title: 'Farmers', url: '/admin/farmers', icon: peopleOutline },
    { title: 'ID Cards', url: '/admin/id-issuance', icon: idCardOutline },
    { title: 'Subsidies', url: '/admin/subsidies', icon: cubeOutline },
    { title: 'SMS', url: '/admin/broadcasts', icon: chatboxEllipsesOutline },
    { title: 'Weather', url: '/admin/weather', icon: cloudOutline },
  ];

  if (authStore.isSuperAdmin) {
    adminOps.push({
      title: 'System Console',
      url: '/superadmin/dashboard',
      icon: shieldCheckmarkOutline,
      exact: true,
    });
  }

  return [
    { key: 'ops', label: 'Operations', items: adminOps },
    { key: 'reports', label: 'Reports', items: reportChildrenAdmin },
  ];
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
  if (url === '/admin/reports/crop-production') {
    return route.path === url || route.path === '/admin/reports/standing-crop';
  }
  if (url === '/brgy/crop-records') {
    return route.path === url
      || route.path === '/brgy/planting-ledger'
      || route.path === '/brgy/standing-crop'
      || route.path === '/brgy/harvesting'
      || route.path === '/brgy/reports/crop-production'
      || route.path === '/brgy/reports/standing-crop';
  }
  if (url === '/brgy/pest-monitoring') {
    return route.path === url || route.path === '/brgy/reports/pest-surveillance';
  }
  if (url === '/brgy/calamity-assessment') {
    return route.path === url || route.path === '/brgy/reports/damage-calamity';
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
.brand-header {
  box-shadow: none;
}
.brand-header::after {
  display: none !important;
}
.brand-toolbar {
  --background: #ffffff;
  --color: #0f172a;
  --border-width: 0 0 1px 0;
  --border-color: #E2E8F0;
  --min-height: 64px;
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 12px;
  --padding-end: 12px;
  height: 64px;
  min-height: 64px;
  overflow: hidden;
}
.brand-toolbar :deep(.toolbar-container) {
  min-height: 64px;
  height: 64px;
  padding-top: 0;
  padding-bottom: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  height: 64px;
}
.brand-seal {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex-shrink: 0;
}
.brand-name {
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: #0f172a;
  white-space: nowrap;
}
.tier-tag {
  flex-shrink: 0;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1A4731;
  background: #E8F5E9;
  border-radius: 999px;
  padding: 0.12rem 0.4rem;
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
  height: 60px;
  min-height: 60px;
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
}
.session-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1A4731;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.session-copy {
  display: flex;
  align-items: baseline;
  gap: 0.28rem;
  min-width: 0;
  flex: 1;
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
  flex-shrink: 0;
}
.logout-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fff;
  color: #b91c1c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.15rem;
}

@media (max-width: 700px) {
  ion-menu { --width: 56px !important; --max-width: 56px !important; --border: none !important; }
  .brand-name, .tier-tag, .nav-group-label, .nav-label, .count-pill, .session-copy { display: none !important; }
  .brand { justify-content: center; }
  .brand-toolbar { --padding-start: 0; --padding-end: 0; }
  .nav-item { --padding-start: 0; --inner-padding-end: 0; --min-height: 52px; justify-content: center; margin: 0; border-left-width: 0; }
  .nav-icon { font-size: 22px; margin: 0 auto !important; margin-inline-end: 0 !important; }
  .nav-children { display: none !important; }
  .session-footer { padding: 0; justify-content: center; }
  .session-row { justify-content: center; }
}
</style>

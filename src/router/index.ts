import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw, RouteLocationRaw } from "vue-router";
import { useAuthStore } from "../stores/authStore";

// ── Role home helper ──────────────────────────────────────────────────────────
export const homeForRole = (role: string | null): string => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "technician") return "/tech/dashboard";
  if (role === "barangay_official") return "/brgy/dashboard";
  return "/login";
};

// Role-aware legacy redirect: keep old flat URLs working after the split.
const legacy =
  (map: Record<string, string>, fallback: string) =>
  (to: any): RouteLocationRaw => {
    const role = useAuthStore().userRole || "";
    return { path: map[role] ?? fallback, query: to.query };
  };

const routes: Array<RouteRecordRaw> = [
  { path: "/", redirect: "/login" },

  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/LoginPage.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/session-lock",
    name: "SessionLock",
    component: () => import("@/views/SessionLockPage.vue"),
    meta: { requiresAuth: false },
  },

  // ── Admin environment (web / desktop, sidebar) ────────────────────────────
  {
    path: "/admin",
    component: () => import("@/layouts/AdminLayout.vue"),
    meta: { requiresAuth: true, role: "admin" },
    children: [
      { path: "", redirect: "/admin/dashboard" },
      { path: "dashboard", name: "Dashboard", component: () => import("@/views/DashboardPage.vue") },
      { path: "analytics", name: "Analytics", component: () => import("@/views/Analytics/AnalyticsPage.vue") },
      { path: "farmers", name: "FarmersList", component: () => import("@/views/Farmers/FarmersListPage.vue") },
      { path: "farmers/register", name: "FarmersRegister", component: () => import("@/views/Farmers/Registration_Form.vue") },
      { path: "id-issuance", name: "IdIssuance", component: () => import("@/views/Farmers/IdIssuancePage.vue") },
      { path: "programs", name: "Programs", component: () => import("@/views/Programs/ProgramsListPage.vue") },
      { path: "inventory", name: "Inventory", component: () => import("@/views/Programs/InventoryPage.vue") },
      { path: "broadcasts", name: "Broadcasts", component: () => import("@/views/Communication/BroadcastCenterPage.vue") },
      { path: "intelligence", name: "Intelligence", component: () => import("@/views/Intelligence/IntelligenceDashboardPage.vue") },
      { path: "weather", name: "PrecisionWeather", component: () => import("@/views/Admin/AdminWeatherHeatmapView.vue") },
      { path: "weather/detail", name: "PrecisionWeatherDetail", component: () => import("@/views/Admin/AdvancedWeatherDashboardView.vue") },
      { path: "map", name: "Map", component: () => import("@/views/Map/MapPage.vue") },
      { path: "reports", name: "Reports", component: () => import("@/views/Reports/ExecutiveReportPage.vue") },
      { path: "executive-reporting", name: "ExecutiveReporting", component: () => import("@/views/Admin/ExecutiveReportingView.vue") },
      { path: "damage-review", name: "DamageReview", component: () => import("@/views/Admin/DamageValidationView.vue") },
    ],
  },

  // ── Technician environment (mobile, bottom tabs) ──────────────────────────
  {
    path: "/tech",
    component: () => import("@/layouts/TechnicianLayout.vue"),
    meta: { requiresAuth: true, role: "technician" },
    children: [
      { path: "", redirect: "/tech/dashboard" },
      { path: "dashboard", name: "TechDashboard", component: () => import("@/views/Technician/TechnicianDashboardView.vue") },
      { path: "history", name: "TechHistory", component: () => import("@/views/Technician/TechnicianHistoryView.vue") },
      { path: "subsidy-dispense", name: "MobileSubsidyDispense", component: () => import("@/views/Technician/MobileSubsidyDispenseView.vue") },
      { path: "scanner", name: "Scan", component: () => import("@/views/Scanner/ScannerPage.vue") },
      { path: "release", name: "Release", component: () => import("@/views/Scanner/ReleasePage.vue") },
      { path: "field", name: "FieldIntelligence", component: () => import("@/views/Technician/FieldIntelligencePage.vue") },
      { path: "planting-log", name: "MobilePlantingLog", component: () => import("@/views/Technician/MobilePlantingLogView.vue") },
      { path: "pest-validation", name: "MobilePestValidation", component: () => import("@/views/Technician/MobilePestValidationView.vue") },
      { path: "pest-response", name: "MobilePestResponse", component: () => import("@/views/Technician/MobilePestResponseView.vue") },
      { path: "pest-queue", name: "MobilePestQueue", component: () => import("@/views/Technician/MobilePestQueueView.vue") },
      { path: "calamity-rdana", name: "MobileCalamityAssessment", component: () => import("@/views/Technician/MobileCalamityAssessmentView.vue") },
      { path: "calamity-queue", name: "MobileCalamityQueue", component: () => import("@/views/Technician/MobileCalamityQueueView.vue") },
      { path: "farm-profiling", name: "FarmProfiling", component: () => import("@/views/Technician/FarmProfilingView.vue") },
      { path: "geo-tag", name: "MobileGeoTag", component: () => import("@/views/Technician/MobileGeoTagView.vue") },
      { path: "extension", name: "ExtensionServices", component: () => import("@/views/Technician/ExtensionServicesView.vue") },
      { path: "damage", name: "DamageAssessment", component: () => import("@/views/Technician/DamageAssessmentPage.vue") },
      { path: "sync", name: "PendingSync", component: () => import("@/views/Sync/PendingSyncPage.vue") },
      { path: "home", name: "Home", component: () => import("@/views/HomePage.vue") },
      { path: "farmers", name: "TechFarmersList", component: () => import("@/views/Farmers/FarmersListPage.vue") },
      { path: "farmers/register", name: "TechFarmersRegister", component: () => import("@/views/Farmers/Registration_Form.vue") },
      { path: "programs", name: "TechPrograms", component: () => import("@/views/Programs/ProgramsListPage.vue") },
      { path: "map", name: "TechMap", component: () => import("@/views/Map/MapPage.vue") },
      { path: "profile", name: "TechProfile", component: () => import("@/views/Technician/ProfilePage.vue") },
    ],
  },

  // ── Barangay Portal (desktop encoding + damage review) ────────────────────
  {
    path: "/brgy",
    component: () => import("@/layouts/BarangayLayout.vue"),
    meta: { requiresAuth: true, role: "barangay_official" },
    children: [
      { path: "", redirect: "/brgy/dashboard" },
      { path: "dashboard", name: "BrgyDashboard", component: () => import("@/views/Barangay/DashboardView.vue") },
      { path: "planting-ledger", name: "BrgyPlantingLedger", component: () => import("@/views/Barangay/PlantingLedgerView.vue") },
      { path: "pest-monitoring", name: "BrgyPestMonitoring", component: () => import("@/views/Barangay/PestMonitoringView.vue") },
      { path: "standing-crop", name: "BrgyStandingCrop", component: () => import("@/views/Barangay/StandingCropLogView.vue") },
      { path: "harvesting", name: "BrgyHarvesting", component: () => import("@/views/Barangay/HarvestingLogView.vue") },
      { path: "calamity-assessment", name: "BrgyCalamityAssessment", component: () => import("@/views/Barangay/CalamityAssessmentLogView.vue") },
      { path: "damage-review", name: "BrgyDamageReview", component: () => import("@/views/Admin/DamageValidationView.vue") },
      { path: "map", name: "BrgyMap", component: () => import("@/views/Map/MapPage.vue") },
    ],
  },

  // Legacy /review bookmarks → Barangay Portal
  { path: "/review", redirect: "/brgy/dashboard" },
  { path: "/review/damage-review", redirect: "/brgy/damage-review" },
  { path: "/review/map", redirect: "/brgy/map" },

  // ── Legacy flat-path redirects (role-aware, query preserved) ──────────────
  { path: "/dashboard", redirect: "/admin/dashboard" },
  { path: "/analytics", redirect: "/admin/analytics" },
  { path: "/reports", redirect: "/admin/reports" },
  { path: "/intelligence", redirect: "/admin/intelligence" },
  { path: "/broadcasts", redirect: "/admin/broadcasts" },
  { path: "/id-issuance", redirect: "/admin/id-issuance" },
  {
    path: "/farmers",
    redirect: legacy({ admin: "/admin/farmers", technician: "/tech/farmers" }, "/admin/farmers"),
  },
  {
    path: "/farmers/register",
    redirect: legacy({ admin: "/admin/farmers/register", technician: "/tech/farmers/register" }, "/admin/farmers/register"),
  },
  {
    path: "/programs",
    redirect: legacy({ admin: "/admin/programs", technician: "/tech/programs" }, "/admin/programs"),
  },
  {
    path: "/map",
    redirect: legacy({ admin: "/admin/map", technician: "/tech/map", barangay_official: "/brgy/map" }, "/admin/map"),
  },
  {
    path: "/damage-review",
    redirect: legacy({ admin: "/admin/damage-review", barangay_official: "/brgy/damage-review" }, "/admin/damage-review"),
  },
  { path: "/scan", redirect: "/tech/subsidy-dispense" },
  { path: "/ScanQR", redirect: "/tech/subsidy-dispense" },
  { path: "/field-intelligence", redirect: "/tech/dashboard" },
  { path: "/field-intel", redirect: "/tech/dashboard" },
  { path: "/damage-assessment", redirect: "/tech/calamity-queue" },
  { path: "/pending-sync", redirect: "/tech/sync" },
  { path: "/home", redirect: "/tech/dashboard" },
  { path: "/technician-home", redirect: "/tech/dashboard" },

  // Catch-all: bounce to login (guard then routes to the correct home).
  { path: "/:pathMatch(.*)*", redirect: "/login" },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

const roleAllowed = (required: unknown, role: string | null): boolean => {
  if (!required) return true;
  if (Array.isArray(required)) return !!role && required.includes(role);
  return required === role;
};

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  const userRole = authStore.userRole;
  const home = homeForRole(userRole);
  // A session is only usable when we have a token AND a role we can route to.
  const hasValidSession = isAuthenticated && home !== "/login";

  // Soft-locked sessions (expired token / inactivity) must re-auth without losing queue.
  if (authStore.sessionLocked && to.name !== "SessionLock" && to.name !== "Login") {
    return next({ name: "SessionLock" });
  }
  if (!authStore.sessionLocked && to.name === "SessionLock") {
    return next(hasValidSession ? home : { name: "Login" });
  }

  if (to.meta.requiresAuth && !hasValidSession) {
    // Avoid redirecting to Login if we're already heading there (prevents loops).
    return to.name === "Login" ? next() : next({ name: "Login" });
  }

  // Prevent cross-role access via manual URL entry.
  if (to.meta.requiresAuth && !roleAllowed(to.meta.role, userRole)) {
    return to.path === home ? next() : next(home);
  }

  if (to.name === "Login" && hasValidSession) {
    return next(home);
  }

  return next();
});

export default router;

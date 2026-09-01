import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw, RouteLocationRaw } from "vue-router";
import { useAuthStore } from "../stores/authStore";

// ── Role home helper ──────────────────────────────────────────────────────────
export const homeForRole = (role: string | null): string => {
  if (role === "super_admin") return "/superadmin/dashboard";
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

// Staff and Security live on SuperAdmin only. Bookmarks under /admin bounce away.
const adminGovernanceRedirect =
  (superAdminPath: string) =>
  (to: any): RouteLocationRaw => {
    const role = useAuthStore().userRole || "";
    return {
      path: role === "super_admin" ? superAdminPath : "/admin/dashboard",
      query: to.query,
    };
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
  {
    path: "/change-password",
    name: "ChangePassword",
    component: () => import("@/views/ChangePasswordPage.vue"),
    meta: { requiresAuth: true },
  },

  // ── SuperAdmin governance portal ──────────────────────────────────────────
  {
    path: "/superadmin",
    component: () => import("@/layouts/SuperAdminLayout.vue"),
    meta: { requiresAuth: true, role: "super_admin" },
    children: [
      { path: "", redirect: "/superadmin/dashboard" },
      { path: "dashboard", name: "SuperAdminDashboard", component: () => import("@/views/SuperAdmin/SuperAdminDashboardView.vue"), meta: { title: "System Console" } },
      { path: "users", name: "SuperAdminUsers", component: () => import("@/views/Staff/UserManagementView.vue"), meta: { title: "User Accounts" } },
      { path: "security", name: "SuperAdminSecurity", component: () => import("@/views/SuperAdmin/SecurityView.vue"), meta: { title: "Security" } },
      { path: "sms", name: "SuperAdminSmsGateway", component: () => import("@/views/SuperAdmin/SmsGatewayView.vue"), meta: { title: "SMS Gateway" } },
      { path: "audit-logs", name: "SuperAdminAuditLogs", component: () => import("@/views/SuperAdmin/AuditLogView.vue"), meta: { title: "Audit Logs" } },
    ],
  },

  // ── Admin environment (web / desktop, sidebar) ────────────────────────────
  {
    path: "/admin",
    component: () => import("@/layouts/AdminLayout.vue"),
    meta: { requiresAuth: true, role: ["admin", "super_admin"] },
    children: [
      { path: "", redirect: "/admin/dashboard" },
      { path: "dashboard", name: "Dashboard", component: () => import("@/views/Admin/AdminDashboardView.vue"), meta: { title: "Dashboard" } },
      { path: "analytics", redirect: "/admin/dashboard" },
      { path: "staff", redirect: adminGovernanceRedirect("/superadmin/users") },
      { path: "security", redirect: adminGovernanceRedirect("/superadmin/security") },
      { path: "farmers", name: "FarmersList", component: () => import("@/views/Admin/FarmerRegistryView.vue"), meta: { title: "Farmer Registry" } },
      { path: "farmers/register", name: "FarmersRegister", component: () => import("@/views/Farmers/Registration_Form.vue"), meta: { title: "RSBSA Enrollment" } },
      { path: "farmers/legacy", redirect: "/admin/farmers" },
      { path: "id-issuance", name: "IdIssuance", component: () => import("@/views/Farmers/IdIssuancePage.vue"), meta: { title: "ID Card Production" } },
      { path: "subsidies", name: "SubsidyPrograms", component: () => import("@/views/Programs/SubsidyProgramsView.vue"), meta: { title: "Subsidy Programs" } },
      { path: "subsidies/:id/masterlist", name: "SubsidyMasterlist", component: () => import("@/views/Programs/SubsidyMasterlistView.vue"), meta: { title: "Subsidy Masterlist" } },
      { path: "broadcasts", name: "Broadcasts", component: () => import("@/views/Communication/BroadcastCenterPage.vue"), meta: { title: "Outreach & SMS" } },
      { path: "intelligence", redirect: "/admin/dashboard" },
      { path: "weather", name: "PrecisionWeather", component: () => import("@/views/Admin/AdminWeatherHeatmapView.vue"), meta: { title: "Climate Monitoring" } },
      { path: "weather/detail", name: "PrecisionWeatherDetail", component: () => import("@/views/Admin/AdvancedWeatherDashboardView.vue"), meta: { title: "Precision Weather" } },
      { path: "weather/climate-hub", redirect: "/admin/weather" },
      { path: "map", redirect: "/admin/dashboard" },
      { path: "reports", redirect: "/admin/reports/subsidies" },
      { path: "reports/subsidies", name: "ReportSubsidies", component: () => import("@/views/Admin/Reports/SubsidyReportView.vue"), meta: { title: "Subsidy Distribution" } },
      { path: "reports/crop-production", name: "ReportCropProduction", component: () => import("@/views/Admin/Reports/CropProductionReportView.vue"), meta: { title: "Crop Production" } },
      { path: "reports/standing-crop", redirect: { path: "/admin/reports/crop-production", query: { mode: "standing" } } },
      { path: "reports/pest-surveillance", name: "ReportPest", component: () => import("@/views/Admin/Reports/PestReportView.vue"), meta: { title: "Pest Surveillance" } },
      { path: "reports/damage-calamity", name: "ReportDamage", component: () => import("@/views/Admin/Reports/DamageReportView.vue"), meta: { title: "Damage & Calamity" } },
      { path: "encoding/planting-ledger", name: "AdminPlantingLedger", component: () => import("@/views/Barangay/PlantingLedgerView.vue"), meta: { title: "Planting Records" } },
      { path: "encoding/pest-monitoring", name: "AdminPestMonitoring", component: () => import("@/views/Barangay/PestMonitoringView.vue"), meta: { title: "Pest Reports" } },
      { path: "encoding/calamity-assessment", name: "AdminCalamityAssessment", component: () => import("@/views/Barangay/CalamityAssessmentLogView.vue"), meta: { title: "Calamity Damage" } },
      { path: "encoding/subsidy-dispense", name: "AdminSubsidyDispense", component: () => import("@/views/Technician/MobileSubsidyDispenseView.vue"), meta: { title: "Give Subsidy" } },
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
      { path: "release", name: "Release", component: () => import("@/views/Scanner/ReleasePage.vue") },
      { path: "pest-response", name: "MobilePestResponse", component: () => import("@/views/Technician/MobilePestResponseView.vue") },
      { path: "pest-queue", name: "MobilePestQueue", component: () => import("@/views/Technician/MobilePestQueueView.vue") },
      { path: "calamity-rdana", name: "MobileCalamityAssessment", component: () => import("@/views/Technician/MobileCalamityAssessmentView.vue") },
      { path: "calamity-queue", name: "MobileCalamityQueue", component: () => import("@/views/Technician/MobileCalamityQueueView.vue") },
      { path: "geo-tag-queue", name: "MobileGeoTagQueue", component: () => import("@/views/Technician/MobileGeoTagQueueView.vue") },
      { path: "geo-tag", name: "MobileGeoTag", component: () => import("@/views/Technician/MobileGeoTagView.vue") },
      { path: "planting", name: "MobilePlantingLog", component: () => import("@/views/Technician/MobilePlantingLogView.vue") },
      { path: "harvest", name: "MobileHarvestLog", component: () => import("@/views/Technician/MobileHarvestLogView.vue") },
      { path: "standing-crop", name: "MobileStandingCropLog", component: () => import("@/views/Technician/MobileStandingCropLogView.vue") },
      { path: "farmers/register", name: "TechFarmersRegister", component: () => import("@/views/Farmers/Registration_Form.vue") },
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
      { path: "dashboard", name: "BrgyDashboard", component: () => import("@/views/Barangay/BrgyDashboardView.vue"), meta: { title: "Dashboard" } },
      { path: "farmers", name: "BrgyFarmerMasterlist", component: () => import("@/views/Barangay/BrgyFarmerMasterlistView.vue"), meta: { title: "Farmers" } },
      { path: "id-issuance", name: "BrgyIdIssuance", component: () => import("@/views/Barangay/BrgyIdIssuanceView.vue"), meta: { title: "ID Cards" } },
      { path: "crop-records", name: "BrgyCropHub", component: () => import("@/views/Barangay/BrgyCropHubView.vue"), meta: { title: "Crop Production" } },
      { path: "planting-ledger", redirect: { path: "/brgy/crop-records", query: { kind: "planting" } } },
      { path: "standing-crop", redirect: { path: "/brgy/crop-records", query: { kind: "standing" } } },
      { path: "harvesting", redirect: { path: "/brgy/crop-records", query: { kind: "harvest" } } },
      { path: "pest-monitoring", name: "BrgyPestMonitoring", component: () => import("@/views/Barangay/PestMonitoringView.vue"), meta: { title: "Pest Reports" } },
      { path: "calamity-assessment", name: "BrgyCalamityAssessment", component: () => import("@/views/Barangay/CalamityAssessmentLogView.vue"), meta: { title: "Disaster Reports" } },
      { path: "reports", redirect: "/brgy/crop-records" },
      { path: "reports/subsidies", name: "BrgyReportSubsidies", component: () => import("@/views/Admin/Reports/SubsidyReportView.vue"), meta: { title: "Subsidy Claims" } },
      {
        path: "reports/crop-production",
        redirect: (to) => {
          const raw = to.query?.mode ?? to.query?.kind;
          const mode = Array.isArray(raw) ? raw[0] : raw;
          const kind = mode === "standing" ? "standing" : mode === "harvest" ? "harvest" : "planting";
          return { path: "/brgy/crop-records", query: { kind } };
        },
      },
      { path: "reports/standing-crop", redirect: { path: "/brgy/crop-records", query: { kind: "standing" } } },
      { path: "reports/pest-surveillance", redirect: "/brgy/pest-monitoring" },
      { path: "reports/damage-calamity", redirect: "/brgy/calamity-assessment" },
      { path: "weather-hub", redirect: "/brgy/dashboard" },
      { path: "map", name: "BrgyMap", component: () => import("@/views/Map/MapPage.vue"), meta: { title: "Farm Map" } },
    ],
  },

  // Legacy /review bookmarks → Barangay Portal
  { path: "/review", redirect: "/brgy/dashboard" },
  { path: "/review/damage-review", redirect: "/brgy/damage-review" },
  { path: "/review/map", redirect: "/brgy/map" },

  // ── Legacy flat-path redirects (role-aware, query preserved) ──────────────
  { path: "/dashboard", redirect: "/admin/dashboard" },
  { path: "/analytics", redirect: "/admin/dashboard" },
  { path: "/reports", redirect: "/admin/reports/subsidies" },
  { path: "/intelligence", redirect: "/admin/intelligence" },
  { path: "/broadcasts", redirect: "/admin/broadcasts" },
  { path: "/id-issuance", redirect: "/admin/id-issuance" },
  {
    path: "/farmers",
    redirect: legacy(
      { admin: "/admin/farmers", technician: "/tech/dashboard", barangay_official: "/brgy/farmers" },
      "/admin/farmers",
    ),
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
    redirect: legacy({ admin: "/admin/dashboard", technician: "/tech/map", barangay_official: "/brgy/map" }, "/admin/dashboard"),
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
  { path: "/pending-sync", redirect: "/tech/dashboard" },
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
  const hasValidSession = isAuthenticated && home !== "/login";

  if (authStore.sessionLocked && to.name !== "SessionLock" && to.name !== "Login") {
    return next({ name: "SessionLock" });
  }
  if (!authStore.sessionLocked && to.name === "SessionLock") {
    return next(hasValidSession ? home : { name: "Login" });
  }

  if (to.meta.requiresAuth && !hasValidSession) {
    return to.name === "Login" ? next() : next({ name: "Login" });
  }

  if (hasValidSession && authStore.mustChangePassword && to.name !== "ChangePassword") {
    return next({ name: "ChangePassword" });
  }

  if (to.meta.requiresAuth && !roleAllowed(to.meta.role, userRole)) {
    return to.path === home ? next() : next(home);
  }

  if (to.name === "Login" && hasValidSession) {
    return next(home);
  }

  return next();
});

export default router;

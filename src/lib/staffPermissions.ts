export type StaffModuleKey =
  | "dashboard"
  | "menu"
  | "inventory"
  | "orders"
  | "promotions"
  | "reports"
  | "tableqr"
  | "settings";

export type StaffPermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "access"
  | "export"
  | "generate"
  | "manageStaff"
  | "manageSystem";

export interface StaffPermissionRow {
  id?: string;
  staff_id?: string;
  module_name: StaffModuleKey;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface StaffSessionData {
  staffId: string;
  businessId: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  permissions: StaffPermissionRow[];
}

export interface StaffModuleConfig {
  module: StaffModuleKey;
  label: string;
  path: string;
  description: string;
  actions: Array<{
    key: keyof Omit<StaffPermissionRow, "id" | "staff_id" | "module_name">;
    label: string;
  }>;
}

export const staffModules: StaffModuleConfig[] = [
  {
    module: "dashboard",
    label: "Dashboard",
    path: "/business/dashboard",
    description: "Can Access Dashboard",
    actions: [{ key: "can_view", label: "Can access dashboard" }],
  },
  {
    module: "menu",
    label: "Menu",
    path: "/business/menu",
    description: "Menu actions",
    actions: [
      { key: "can_view", label: "Can view menu" },
      { key: "can_create", label: "Can add menu" },
      { key: "can_edit", label: "Can edit menu" },
      { key: "can_delete", label: "Can delete menu" },
    ],
  },
  {
    module: "inventory",
    label: "Inventory",
    path: "/business/inventory",
    description: "Inventory actions",
    actions: [
      { key: "can_view", label: "Can view inventory" },
      { key: "can_create", label: "Can add inventory" },
      { key: "can_edit", label: "Can edit inventory" },
      { key: "can_delete", label: "Can update stock" },
    ],
  },
  {
    module: "orders",
    label: "Orders",
    path: "/business/orders",
    description: "Order actions",
    actions: [
      { key: "can_view", label: "Can view orders" },
      { key: "can_create", label: "Can create orders" },
      { key: "can_edit", label: "Can update order status" },
      { key: "can_delete", label: "Can cancel orders" },
    ],
  },
  {
    module: "promotions",
    label: "Promotions",
    path: "/business/promotions",
    description: "Promotions actions",
    actions: [
      { key: "can_view", label: "Can access promotions" },
      { key: "can_create", label: "Can create coupons" },
      { key: "can_edit", label: "Can manage reward coupons" },
      { key: "can_delete", label: "Can delete promotions" },
    ],
  },
  {
    module: "reports",
    label: "Reports",
    path: "/business/reports",
    description: "Reports actions",
    actions: [
      { key: "can_view", label: "Can view reports" },
      { key: "can_create", label: "Can export reports" },
      { key: "can_edit", label: "Can edit reports" },
      { key: "can_delete", label: "Can delete reports" },
    ],
  },
  {
    module: "tableqr",
    label: "Table QR",
    path: "/business/tableqr",
    description: "Table QR actions",
    actions: [
      { key: "can_view", label: "Can access Table QR" },
      { key: "can_create", label: "Can generate QR" },
      { key: "can_edit", label: "Can edit QR tables" },
      { key: "can_delete", label: "Can delete QR tables" },
    ],
  },
  {
    module: "settings",
    label: "Settings",
    path: "/business/settings",
    description: "Settings actions",
    actions: [
      { key: "can_view", label: "Can access settings" },
      { key: "can_create", label: "Can manage staff accounts" },
      { key: "can_edit", label: "Can manage system settings" },
      { key: "can_delete", label: "Can delete settings" },
    ],
  },
];

const ZERO_PERMISSIONS: Omit<StaffPermissionRow, "id" | "staff_id"> = {
  module_name: "dashboard",
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
};

export const defaultPermissionsByRole: Record<string, StaffPermissionRow[]> = {
  cashier: [
    { ...ZERO_PERMISSIONS, module_name: "dashboard", can_view: true },
    { ...ZERO_PERMISSIONS, module_name: "menu", can_view: true },
    { ...ZERO_PERMISSIONS, module_name: "orders", can_view: true, can_create: true },
  ],
  waiter: [
    { ...ZERO_PERMISSIONS, module_name: "dashboard", can_view: true },
    { ...ZERO_PERMISSIONS, module_name: "menu", can_view: true },
    { ...ZERO_PERMISSIONS, module_name: "orders", can_view: true, can_create: true, can_edit: true },
    { ...ZERO_PERMISSIONS, module_name: "tableqr", can_view: true },
  ],
  "kitchen staff": [
    { ...ZERO_PERMISSIONS, module_name: "dashboard", can_view: true },
    { ...ZERO_PERMISSIONS, module_name: "orders", can_view: true, can_edit: true },
  ],
  "inventory staff": [
    { ...ZERO_PERMISSIONS, module_name: "dashboard", can_view: true },
    { ...ZERO_PERMISSIONS, module_name: "inventory", can_view: true, can_create: true, can_edit: true, can_delete: true },
  ],
  manager: [
    ...staffModules.map((module) => ({
      ...ZERO_PERMISSIONS,
      module_name: module.module,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
    })),
  ],
  custom: staffModules.map((module) => ({
    ...ZERO_PERMISSIONS,
    module_name: module.module,
  })),
};

export function getDefaultPermissionsForRole(role: string): StaffPermissionRow[] {
  return defaultPermissionsByRole[role.toLowerCase()] ?? defaultPermissionsByRole.custom;
}

export function normalizeModuleName(value: string): StaffModuleKey {
  const normalized = value.toLowerCase();
  if (normalized === "table qr" || normalized === "tableqr") return "tableqr";
  if (normalized === "inventory staff") return "inventory" as StaffModuleKey;
  return normalized as StaffModuleKey;
}

export function hasStaffPermission(
  staffSession: StaffSessionData | null,
  module: StaffModuleKey,
  action: StaffPermissionAction
): boolean {
  if (!staffSession) return false;

  const row = staffSession.permissions.find((permission) => permission.module_name === module);
  if (!row) return false;

  switch (action) {
    case "view":
    case "access":
      return row.can_view;
    case "create":
      return row.can_create;
    case "edit":
      return row.can_edit;
    case "delete":
      return row.can_delete;
    case "export":
      return row.can_create;
    case "generate":
      return row.can_create;
    case "manageStaff":
      return row.can_create;
    case "manageSystem":
      return row.can_edit;
    default:
      return false;
  }
}

export function getRedirectPathForRole(role: string): string {
  switch (role.toLowerCase()) {
    case "cashier":
      return "/business/orders";
    case "waiter":
      return "/business/orders";
    case "kitchen staff":
      return "/business/orders";
    case "inventory staff":
      return "/business/inventory";
    case "manager":
      return "/business/dashboard";
    default:
      return "/business/dashboard";
  }
}

export function getSidebarVisibility(
  staffSession: StaffSessionData | null,
  module: StaffModuleKey
): boolean {
  if (!staffSession) return true;
  switch (module) {
    case "dashboard":
      return hasStaffPermission(staffSession, module, "view");
    case "menu":
      return hasStaffPermission(staffSession, module, "view");
    case "inventory":
      return hasStaffPermission(staffSession, module, "view");
    case "orders":
      return hasStaffPermission(staffSession, module, "view");
    case "promotions":
      return hasStaffPermission(staffSession, module, "access");
    case "reports":
      return hasStaffPermission(staffSession, module, "view");
    case "tableqr":
      return hasStaffPermission(staffSession, module, "view");
    case "settings":
      return hasStaffPermission(staffSession, module, "access");
    default:
      return false;
  }
}

"use client";

import { useRouter, usePathname } from "next/navigation";
import { useStaffSession } from "@/hooks/useStaffSession";
import {
  getSidebarVisibility,
  hasStaffPermission,
  type StaffModuleKey,
  type StaffPermissionAction,
} from "@/lib/staffPermissions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faShoppingCart,
  faBagShopping,
  faChartSimple,
  faComments,
  faGear,
  faBox,
  faTags,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

type BusinessSidebarProps = {
  onClose?: () => void;
  ordersCount?: number;
};

type SidebarItem = {
  label: string;
  path: string;
  icon: typeof faGaugeHigh;
  module: StaffModuleKey;
  requiredAction?: StaffPermissionAction;
};

export default function BusinessSidebar({ onClose, ordersCount }: BusinessSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { staffSession } = useStaffSession();

  const ordersLabel = ordersCount !== undefined ? `Orders (${ordersCount})` : "Orders";
  const navItems: SidebarItem[] = [
    { label: "Dashboard", path: "/business/dashboard", icon: faGaugeHigh, module: "dashboard" },
    { label: "Menu", path: "/business/menu", icon: faBagShopping, module: "menu" },
    { label: "Inventory", path: "/business/inventory", icon: faBox, module: "inventory" },
    { label: ordersLabel, path: "/business/orders", icon: faShoppingCart, module: "orders" },
    { label: "Promotions", path: "/business/promotions", icon: faTags, module: "promotions" },
    { label: "Reports", path: "/business/reports", icon: faChartSimple, module: "reports" },
    { label: "Table QR", path: "/business/tableqr", icon: faComments, module: "tableqr" },
    { label: "Settings", path: "/business/settings", icon: faGear, module: "settings" },
    {
      label: "Staff",
      path: "/business/settings/staff",
      icon: faUsers,
      module: "settings",
      requiredAction: "manageStaff",
    },
  ];

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-full lg:sticky lg:top-0 lg:self-start">
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
          <FontAwesomeIcon icon={faGaugeHigh} className="text-sm" />
          <span>Business Dashboard</span>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems
          .filter((item) => {
            if (!staffSession) return true;
            if (item.requiredAction) {
              return hasStaffPermission(staffSession, item.module, item.requiredAction);
            }
            return getSidebarVisibility(staffSession, item.module);
          })
          .map((item) => {
            const isActive = pathname === item.path;

            return (
              <button
                key={item.path + item.label}
                type="button"
                onClick={() => router.push(item.path)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-1.5 text-left text-[11px] sm:text-xs font-semibold transition ${
                  isActive
                    ? "bg-gradient-to-r from-[#4f65ff] to-[#8e7ffd] text-white shadow-md shadow-[#4f65ff]/15"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition ${
                  isActive ? "bg-white/15 text-white" : "bg-white text-slate-600 group-hover:bg-slate-200"
                }`}>
                  <FontAwesomeIcon icon={item.icon} className="text-[11px] sm:text-xs" />
                </span>
                <span className="capitalize text-[11px] sm:text-xs">{item.label}</span>
              </button>
            );
          })}
      </nav>

      {onClose && (
        <div className="mt-4 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      )}
    </aside>
  );
}
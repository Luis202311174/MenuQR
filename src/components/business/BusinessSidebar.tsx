"use client";

import { useEffect, useState } from "react";
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
  faLayerGroup,
  faSliders,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

type BusinessSidebarProps = {
  ordersCount?: number;
  variant?: "desktop" | "mobile";
};

type SidebarItem = {
  label: string;
  path: string;
  icon: typeof faGaugeHigh;
  module: StaffModuleKey;
  requiredAction?: StaffPermissionAction;
};

export default function BusinessSidebar({ ordersCount, variant = "desktop" }: BusinessSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { staffSession } = useStaffSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ordersLabel = ordersCount !== undefined ? `Orders (${ordersCount})` : "Orders";
  const navItems: SidebarItem[] = [

    { label: "Dashboard", path: "/business/dashboard", icon: faGaugeHigh, module: "dashboard" },
    ...(staffSession ? [{ label: "Staff Dashboard", path: "/business/staff-dashboard", icon: faGaugeHigh, module: "dashboard" as const }] : []),
    { label: "Menu", path: "/business/menu", icon: faBagShopping, module: "menu" },
    { label: "Categories", path: "/business/categories", icon: faLayerGroup, module: "menu" },
    { label: "Option Groups", path: "/business/options", icon: faSliders, module: "menu" },
    { label: "Inventory", path: "/business/inventory", icon: faBox, module: "inventory" },
    { label: ordersLabel, path: "/business/orders", icon: faShoppingCart, module: "orders" },
    { label: "Promotions", path: "/business/promotions", icon: faTags, module: "promotions" },
    { label: "Reports", path: "/business/reports", icon: faChartSimple, module: "reports" },
    { label: "Table QR", path: "/business/tableqr", icon: faComments, module: "tableqr" },
    { label: "Settings", path: "/business/settings", icon: faGear, module: "settings" },
    { label: "Staff", path: "/business/settings/staff", icon: faUsers, module: "settings", requiredAction: "manageStaff" },

  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.label === "Staff Dashboard" && staffSession) return true;
    if (!staffSession) return true;
    if (item.requiredAction) {
      return hasStaffPermission(staffSession, item.module, item.requiredAction);
    }
    return getSidebarVisibility(staffSession, item.module);
  });

  const currentNavItem = visibleNavItems.find((item) =>
    pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  const renderNavItem = (item: SidebarItem) => {
    const isActive = pathname === item.path || (item.path !== "/business/dashboard" && pathname.startsWith(`${item.path}/`));

    if (variant === "mobile") {
      return (
        <button
          key={item.path + item.label}
          type="button"
          aria-current={isActive ? "page" : undefined}
          onClick={() => {
            setMobileMenuOpen(false);
            router.push(item.path);
          }}
          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
            isActive
              ? "bg-blue-700 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"
          }`}>
            <FontAwesomeIcon icon={item.icon} className="text-sm" />
          </span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {isActive && <span className="h-2 w-2 shrink-0 rounded-full bg-white" aria-hidden="true" />}
        </button>
      );
    }

    return (
      <button
        key={item.path + item.label}
        type="button"
        aria-current={isActive ? "page" : undefined}
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
  };

  if (variant === "mobile") {
    return (
      <>
        <div className="flex min-h-14 items-center gap-3 px-4 py-2">
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close business navigation" : "Open business navigation"}
            aria-expanded={mobileMenuOpen}
            aria-controls="business-mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Business</p>
            <p className="truncate text-sm font-bold text-slate-900">
              {currentNavItem?.label ?? "Dashboard"}
            </p>
          </div>
          {ordersCount !== undefined && (
            <div className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
              {ordersCount} orders
            </div>
          )}
        </div>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close business navigation"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/40"
            />
            <nav
              id="business-mobile-navigation"
              aria-label="Business navigation"
              className="absolute inset-y-0 left-0 flex w-[min(19rem,88vw)] flex-col border-r border-slate-200 bg-white p-4 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">MenuQR</p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">Business</p>
                </div>
                <button
                  type="button"
                  aria-label="Close business navigation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
              <div className="space-y-1 overflow-y-auto">
                {visibleNavItems.map(renderNavItem)}
              </div>
            </nav>
          </div>
        )}
      </>
    );
  }

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-full lg:sticky lg:top-0 lg:self-start">
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
          <FontAwesomeIcon icon={faGaugeHigh} className="text-sm" />
          <span>Business Dashboard</span>
        </div>
      </div>

      <nav className="space-y-2">
        {visibleNavItems.map(renderNavItem)}
      </nav>

    </aside>
  );
}
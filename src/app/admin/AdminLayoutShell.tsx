"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  faArrowLeft,
  faBoxesStacked,
  faBars,
  faClipboardList,
  faShieldHalved,
  faStore,
  faTags,
  faUsers,
  faUtensils,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ADMIN_RESOURCES } from "@/lib/adminResources";

type AdminNavigationValue = {
  resourceName: string;
  setResourceName: (resourceName: string) => void;
  selectedBusiness: AdminBusiness | null;
  setSelectedBusiness: (business: AdminBusiness | null) => void;
};

export interface AdminBusiness {
  id: string;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  address?: string | null;
  store_category?: string | null;
  buss_email?: string | null;
}

const AdminNavigationContext = createContext<AdminNavigationValue | null>(null);

export function useAdminNavigation() {
  const context = useContext(AdminNavigationContext);
  if (!context) throw new Error("useAdminNavigation must be used within the admin layout.");
  return context;
}

const navigationGroups = [
  { label: "Restaurant", icon: faStore, resources: ["businesses", "users", "business_socials"] },
  {
    label: "Menu & catalog",
    icon: faUtensils,
    resources: [
      "menu_items",
      "menu_categories",
      "option_groups",
      "option_choices",
      "item_option_groups",
      "menu_item_option_groups",
      "menu_item_options",
      "menu_item_bundles",
      "menu_item_bundle_items",
    ],
  },
  {
    label: "Orders & sales",
    icon: faClipboardList,
    resources: ["orders", "payments", "daily_sales", "order_ratings"],
  },
  {
    label: "Staff & access",
    icon: faUsers,
    resources: [
      "staff_accounts",
      "business_staff",
      "staff_users",
      "staff_permissions",
      "staff_sessions",
      "staff_shift_logs",
    ],
  },
  {
    label: "Promotions",
    icon: faTags,
    resources: ["coupons", "coupon_claims"],
  },
  {
    label: "Operations",
    icon: faBoxesStacked,
    resources: ["tables", "table_sessions", "inventory_notifications", "inventory_audit"],
  },
  {
    label: "Customer activity",
    icon: faShieldHalved,
    resources: ["order_activity_logs", "saved_menus", "coupon_usage"],
  },
] as const;

function AdminNavigation({
  resourceName,
  setResourceName,
  onNavigate,
}: AdminNavigationValue & { onNavigate?: () => void }) {
  const [openGroup, setOpenGroup] = useState<string>(() =>
    navigationGroups.find((group) => group.resources.some((resource) => resource === resourceName))?.label ?? "Restaurant",
  );

  return (
    <nav aria-label="Admin sections" className="space-y-5">
      {navigationGroups.map((group) => (
        <section key={group.label}>
          <button
            type="button"
            aria-expanded={openGroup === group.label}
            onClick={() => setOpenGroup((current) => current === group.label ? "" : group.label)}
            className={`mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] transition ${
              openGroup === group.label ? "bg-[#f4f7ff] text-[#3548b8]" : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <FontAwesomeIcon icon={group.icon} className="text-xs" />
            <span className="flex-1">{group.label}</span>
            <span className="text-sm">{openGroup === group.label ? "−" : "+"}</span>
          </button>
          {openGroup === group.label && <div className="space-y-1">
            {group.resources.map((key) => {
              const resource = ADMIN_RESOURCES[key];
              if (!resource) return null;
              const active = resourceName === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    setResourceName(key);
                    setOpenGroup(group.label);
                    onNavigate?.();
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-[#4f65ff] to-[#8e7ffd] text-white shadow-md shadow-[#4f65ff]/20"
                      : "text-slate-600 hover:bg-[#eef4ff] hover:text-[#263fba]"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-white" : "bg-slate-300 group-hover:bg-[#4f65ff]"
                  }`} />
                  <span className="min-w-0 truncate">{resource.label}</span>
                </button>
              );
            })}
          </div>}
        </section>
      ))}
    </nav>
  );
}

export default function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [resourceName, setResourceName] = useState("businesses");
  const [selectedBusiness, setSelectedBusiness] = useState<AdminBusiness | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const navigationValue = useMemo(
    () => ({ resourceName, setResourceName, selectedBusiness, setSelectedBusiness }),
    [resourceName, selectedBusiness],
  );
  const isStandalonePage = pathname === "/admin/login" || pathname.startsWith("/admin/auth/");

  useEffect(() => {
    const toggleNavigation = () => {
      if (selectedBusiness) setMobileNavigationOpen((open) => !open);
    };
    window.addEventListener("adminNavigationToggle", toggleNavigation);
    return () => window.removeEventListener("adminNavigationToggle", toggleNavigation);
  }, [selectedBusiness]);

  if (isStandalonePage) return <>{children}</>;

  return (
    <AdminNavigationContext.Provider value={navigationValue}>
      <div className="min-h-screen bg-[#f4f7ff] text-slate-900">
        <div className="flex min-h-screen">
          {selectedBusiness && <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[290px] shrink-0 border-r border-[#dfe7fb] bg-white lg:block">
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-100 px-6 py-5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBusiness(null);
                    setResourceName("businesses");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4f65ff] to-[#8e7ffd] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#4f65ff]/20 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#4f65ff] focus:ring-offset-2"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  <span>All restaurants</span>
                </button>
                {selectedBusiness && (
                  <p className="mt-3 truncate rounded-lg bg-[#eef4ff] px-3 py-2 text-sm font-semibold text-[#263fba]" title={selectedBusiness.name}>
                    {selectedBusiness.name}
                  </p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-5">
                {selectedBusiness && (
                  <AdminNavigation
                    resourceName={resourceName}
                    setResourceName={setResourceName}
                    selectedBusiness={selectedBusiness}
                    setSelectedBusiness={setSelectedBusiness}
                  />
                )}
              </div>
            </div>
          </aside>}

          <div className="min-w-0 flex-1">
            {mobileNavigationOpen && (
              <div className="max-h-[70vh] overflow-y-auto border-b border-slate-100 bg-white px-4 py-5 lg:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBusiness(null);
                    setResourceName("businesses");
                    setMobileNavigationOpen(false);
                  }}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4f65ff] to-[#8e7ffd] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#4f65ff]/20 transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#4f65ff] focus:ring-offset-2"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  All restaurants
                </button>
                {selectedBusiness && (
                  <AdminNavigation
                    resourceName={resourceName}
                    setResourceName={setResourceName}
                    selectedBusiness={selectedBusiness}
                    setSelectedBusiness={setSelectedBusiness}
                    onNavigate={() => setMobileNavigationOpen(false)}
                  />
                )}
              </div>
            )}

            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AdminNavigationContext.Provider>
  );
}

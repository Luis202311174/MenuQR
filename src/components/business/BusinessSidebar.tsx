"use client";

import { useRouter, usePathname } from "next/navigation";

export default function BusinessSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", path: "/business/dashboard" },
    { label: "Menu", path: "/business/menu" },
    { label: "Orders", path: "/business/orders" },
    { label: "Reports", path: "/business/reports" },
    { label: "Table QR", path: "/business/tableqr" },
    { label: "Configure Business", path: "/business/settings" },
  ];

  return (
    <aside className="min-h-screen rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Business Menu</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">Control Center</h2>
      </div>

      <nav className="space-y-3">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full rounded-3xl px-4 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "bg-[#E23838] text-white shadow-lg"
                  : "bg-[#F9F1ED] text-slate-800 hover:bg-[#ffe8df]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
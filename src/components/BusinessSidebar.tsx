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
    <aside className="border-r border-gray-200 p-6 bg-white space-y-4 min-h-screen">
      {navItems.map((item) => {
        const isActive = pathname === item.path;

        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`w-full text-left rounded-lg py-3 px-4 text-base font-semibold transition ${
              isActive
                ? "bg-[#E23838] text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </aside>
  );
}
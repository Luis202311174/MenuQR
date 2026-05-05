"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessOrdersNotifier from "@/components/business/BusinessOrdersNotifier";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [ordersCount, setOrdersCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Check if current path is under /business/*
  const isBusinessPage = pathname.startsWith("/business");

  if (!isBusinessPage) {
    return <>{children}</>;
  }

  return (
    <>
      <BusinessOrdersNotifier businessId={businessId} onCountChange={setOrdersCount} />
      
      <div className="min-h-screen bg-gray-50">
        <div className="grid lg:grid-cols-[260px_1fr] h-screen">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block border-r border-slate-200 bg-white shadow-sm">
            <BusinessSidebar ordersCount={ordersCount} />
          </div>

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 w-[90vw] max-w-xs overflow-y-auto bg-white shadow-xl border-r border-slate-200 lg:hidden">
                <BusinessSidebar onClose={() => setSidebarOpen(false)} ordersCount={ordersCount} />
              </div>
            </>
          )}

          {/* Mobile Toggle Button */}
          <div className="lg:hidden p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-3xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm border border-slate-200"
            >
              Menu
            </button>
          </div>

          {/* Main Content */}
          <main className="overflow-y-auto">{children}</main>
        </div>
      </div>
    </>
  );
}


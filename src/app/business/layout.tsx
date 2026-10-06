"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessOrdersNotifier from "@/components/business/BusinessOrdersNotifier";
import StaffShiftFloatingModal from "@/components/business/StaffShiftFloatingModal";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [ordersCount, setOrdersCount] = useState(0);

  // Check if current path is under /business/* but NOT the homepage /business
  const isBusinessDashboard = pathname.startsWith("/business/") && pathname !== "/business";

  if (!isBusinessDashboard) {
    return <>{children}</>;
  }

  return (
    <>
      <BusinessOrdersNotifier onCountChange={setOrdersCount} />
      <StaffShiftFloatingModal />
      
      <div className="min-h-screen bg-gray-50">
        <div className="grid min-h-screen lg:h-screen lg:grid-cols-[260px_1fr]">
          {/* Mobile horizontal navigation */}
          <div className="sticky top-0 z-30 min-w-0 border-b border-slate-200 bg-white lg:hidden">
            <BusinessSidebar variant="mobile" ordersCount={ordersCount} />
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block border-r border-slate-200 bg-white shadow-sm">
            <BusinessSidebar ordersCount={ordersCount} />
          </div>

          {/* Main Content */}
          <main className="min-w-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </>
  );
}


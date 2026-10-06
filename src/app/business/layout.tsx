"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
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
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const updateScrollState = () => {
      setShowBackToTop(window.scrollY > 240 || (mainRef.current?.scrollTop ?? 0) > 240);
    };

    window.addEventListener("scroll", updateScrollState, { passive: true });
    const main = mainRef.current;
    main?.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();

    return () => {
      window.removeEventListener("scroll", updateScrollState);
      main?.removeEventListener("scroll", updateScrollState);
    };
  }, [pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          <main ref={mainRef} className="min-w-0 overflow-y-auto">{children}</main>
        </div>
      </div>
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white shadow-lg transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:hidden"
        >
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
      )}
    </>
  );
}

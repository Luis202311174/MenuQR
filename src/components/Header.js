"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { getStoredReceipts, clearStoredReceipts } from "@/utils/receiptManager";
import { clearStoredLowStockNotifications } from "@/utils/lowStockNotifications";
import {
  getStoredNotifications,
  clearStoredNotifications,
  acknowledgeNotification,
  isAcknowledgedToday,
} from "@/utils/notificationManager";
import { cleanupStaleNotifications } from "@/utils/notificationCleanup";
import Image from "next/image";
import Link from "next/link";
import { useStaffSession } from "@/hooks/useStaffSession";


export default function Header() {
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [unreadReceipts, setUnreadReceipts] = useState(0);
  const [storedNotifications, setStoredNotifications] = useState([]);
  const [showBell, setShowBell] = useState(false);
  const [notifierMuted, setNotifierMuted] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        setSession(data.session);
        setUser(data.session?.user);

        if (data.session?.user) {
          const { data: u } = await supabase
            .from("users")
            .select("role")
            .eq("id", data.session.user.id)
            .single();

          setRole(u?.role || null);
        }
      } catch (error) {
        console.warn("Header supabase auth session failed:", error);
        setSession(null);
        setUser(null);
        setRole(null);
      } finally {
        setRoleChecked(true);
      }

      try {
        const resp = await fetch("/api/staff/session", {
          credentials: "include",
        });

        if (resp.ok) {
          setIsStaff(true);
        } else {
          setIsStaff(false);
        }
      } catch (err) {
        setIsStaff(false);
      }
    }; loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user);

        if (session?.user) {
          supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single()
            .then(({ data: u }) => setRole(u?.role || null));
        } else {
          setRole(null);
        } setRoleChecked(true);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [pathname]);

  useEffect(() => {
    const loadReceiptCount = () => {
      try {
        const receipts = getStoredReceipts();
        setUnreadReceipts(Array.isArray(receipts) ? receipts.length : 0);
      } catch (e) {
        setUnreadReceipts(0);
      }
    };

    const loadNotifications = async () => {
      try {
        // Clean up stale notifications first
        await cleanupStaleNotifications();
        // Then load the fresh list
        setStoredNotifications(getStoredNotifications());
      } catch (e) {
        console.error("Error loading notifications:", e);
        setStoredNotifications([]);
      }
    };

    loadReceiptCount();
    loadNotifications();

    try {
      const muted = typeof window !== 'undefined' && localStorage.getItem('notifierMuted') === 'true';
      setNotifierMuted(Boolean(muted));
    } catch (e) {
      setNotifierMuted(false);
    }

    const receiptHandler = () => setTimeout(loadReceiptCount, 0);
    const lowStockHandler = () => setTimeout(loadNotifications, 0);
    const genericHandler = () => setTimeout(loadNotifications, 0);

    window.addEventListener('receiptNotificationsUpdated', receiptHandler);
    window.addEventListener('lowStockNotificationsUpdated', lowStockHandler);
    window.addEventListener('notificationsUpdated', genericHandler);

    return () => {
      window.removeEventListener('receiptNotificationsUpdated', receiptHandler);
      window.removeEventListener('lowStockNotificationsUpdated', lowStockHandler);
      window.removeEventListener('notificationsUpdated', genericHandler);
    };
  }, []);

  const handleSelectRole = (role) => {
    sessionStorage.setItem("selectedRole", role);
    setShowModal(false);
  };

  const handleNotificationClick = (notification) => {
    setShowBell(false);
    if (!notification?.href) return;
    try {
      if (notification.id) acknowledgeNotification(notification.id);
    } catch (e) {}
    router.push(notification.href);
  };

  const homeHref = "/";
  const dashboardHref = isStaff || role === "owner" ? "/business/dashboard" : "/user-home";
  const dashboardLabel = isStaff || role === "owner" ? "My Dashboard" : "Menu Dashboard";
  const storedReceipts = getStoredReceipts();
  const visibleNotifications = Array.isArray(storedNotifications)
    ? storedNotifications.filter((n) => !isAcknowledgedToday(n))
    : [];
  const notificationCount = storedReceipts.length + visibleNotifications.length;

  // When the bell is closed, mark any visible notifications as acknowledged for today
  useEffect(() => {
    // Only act when transitioning from open -> closed
    let prev = false;
    try { prev = window.__prevShowBell === true; } catch (e) {}
    window.__prevShowBell = showBell;
    if (prev && !showBell) {
      try {
        visibleNotifications.forEach((n) => {
          if (n && n.id && !isAcknowledgedToday(n)) acknowledgeNotification(n.id);
        });
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBell]);

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href={homeHref} className="flex items-center gap-3">
              <Image src="/hero-icon.png" alt="MenuQR logo" width={42} height={42} className="h-10 w-10 object-contain" />
              <span className="text-xl sm:text-3xl font-bold text-slate-900">
                MenuQR
              </span>
            </Link>
          </div>

          <nav className="hidden flex-1 justify-end md:flex">
            <div className="flex flex-wrap items-center justify-end gap-8 text-sm font-semibold text-[#102A43]">
              {!(roleChecked && (role === 'owner' || isStaff)) && (
                <Link
                  href={homeHref}
                  className={`transition hover:text-slate-900 ${pathname === homeHref ? "underline decoration-2 underline-offset-4" : ""}`}
                >
                  Home
                </Link>
              )}

              {roleChecked && (
                <Link
                  href={dashboardHref}
                  className={`transition hover:text-slate-900 ${pathname.startsWith(dashboardHref) ? "underline decoration-2 underline-offset-4" : ""}`}
                >
                  {dashboardLabel}
                </Link>
              )}

              {isStaff ? (
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/staff/logout', { method: 'POST', credentials: 'include' });
                    } catch (err) {
                      console.error('Staff logout failed', err);
                    }
                    window.location.href = '/';
                  }}
                  className="transition hover:text-slate-900"
                >
                  Log out
                </button>
              ) : user ? (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                  className="transition hover:text-slate-900"
                >
                  Log out
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowModal(true)}
                    className="transition hover:text-slate-900"
                  >
                    Sign Up
                  </button>

                  <Link
                    href="/login"
                    className="transition hover:text-slate-900"
                  >
                    Login
                  </Link>
                </div>
              )}

              {/* Notifications bell */}
              <div className="relative">
                <button
                  onClick={() => setShowBell((s) => !s)}
                  className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-slate-100"
                  aria-label="Notifications"
                >
                  <svg className="h-5 w-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] px-1.5 py-0.5">{notificationCount}</span>
                  )}
                </button>

                {showBell && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Notifications</h4>
                      <button
                        onClick={() => {
                          // Acknowledge visible notifications before clearing
                          try {
                            visibleNotifications.forEach((n) => {
                              if (n && n.id) acknowledgeNotification(n.id);
                            });
                          } catch (e) {}
                          clearStoredReceipts();
                          clearStoredLowStockNotifications();
                          clearStoredNotifications();
                          setUnreadReceipts(0);
                          setStoredNotifications([]);
                          setShowBell(false);
                        }}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {storedNotifications.length === 0 && storedReceipts.length === 0 ? (
                        <p className="text-xs text-slate-500">No notifications</p>
                      ) : (
                        <>
                          {visibleNotifications.length > 0 && (
                            <div className="space-y-2">
                              {visibleNotifications.slice().reverse().map((notif) => (
                                <button
                                  key={notif.id}
                                  onClick={() => handleNotificationClick(notif)}
                                  className="w-full text-left py-2 border-b last:border-b-0"
                                >
                                  <div className="text-sm font-medium">{notif.title}</div>
                                  <div className="text-xs text-slate-500">{notif.message}</div>
                                  <div className="text-xs text-slate-400">{new Date(notif.timestamp).toLocaleString()}</div>
                                </button>
                              ))}
                            </div>
                          )}

                          {storedReceipts.length > 0 && (
                            <div className={storedNotifications.length > 0 ? 'mt-3' : ''}>
                              {storedReceipts.slice().reverse().map((r, idx) => (
                                <button
                                  key={r.id || idx}
                                  onClick={() => handleNotificationClick({ href: dashboardHref })}
                                  className="w-full text-left py-2 border-b last:border-b-0"
                                >
                                  <div className="text-sm font-medium">Receipt: {r.id}</div>
                                  <div className="text-xs text-slate-500">Total: ₱{Number(r.total_amount).toFixed(2)}</div>
                                  <div className="text-xs text-slate-400">{new Date(r.timestamp).toLocaleString()}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-slate-600">Sound</div>
                      <button
                        onClick={() => {
                          const next = !notifierMuted;
                          setNotifierMuted(next);
                          try { localStorage.setItem('notifierMuted', next ? 'true' : 'false'); } catch (e) {}
                        }}
                        className={`px-3 py-1 rounded-xl text-sm ${notifierMuted ? 'bg-slate-100' : 'bg-emerald-600 text-white'}`}
                      >
                        {notifierMuted ? 'Muted' : 'On'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white p-2 text-[#102A43] md:hidden"
            aria-label="Toggle navigation"
          >
            <span className="sr-only">Toggle navigation</span>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <path d="M3 12h18" />
                  <path d="M3 6h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>

        <div className={`${mobileMenuOpen ? "block" : "hidden"} border-t border-slate-200 bg-slate-50 md:hidden`}>
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 py-4">
            <Link
              href={homeHref}
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-[#102A43] transition hover:text-slate-900"
            >
              Home
            </Link>
            {!(roleChecked && (role === 'owner' || isStaff)) && (
              <Link
                href={homeHref}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-[#102A43] transition hover:text-slate-900"
              >
                Home
              </Link>
            )}

            {roleChecked && (
              <Link
                href={dashboardHref}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-[#102A43] transition hover:text-slate-900"
              >
                {dashboardLabel}
              </Link>
            )}
            {isStaff ? (
              <>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/staff/logout', { method: 'POST', credentials: 'include' });
                    } catch (err) {
                      console.error('Staff logout failed', err);
                    }
                    window.location.href = '/';
                  }}
                  className="text-left text-sm font-semibold text-[#102A43] transition hover:text-slate-900"
                >
                  Log out
                </button>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 inline-flex items-center justify-center rounded-2xl bg-[#102A43] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-300 transition hover:bg-slate-900"
                >
                  Dashboard
                </Link>
              </>
            ) : user ? (
              <>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                  className="text-left text-sm font-semibold text-[#102A43] transition hover:text-slate-900"
                >
                  Log out
                </button>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 inline-flex items-center justify-center rounded-2xl bg-[#102A43] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-300 transition hover:bg-slate-900"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => {
                    setShowModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-[#102A43] px-5 py-3 text-sm font-semibold text-[#102A43] transition hover:bg-slate-100"
                >
                  Sign Up
                </button>

                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#102A43] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-300 transition hover:bg-slate-900"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* REGISTER MODAL */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4 z-50">
          {/* Modal */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full relative">
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-white hover:text-gray-100 text-2xl font-semibold z-10"
            >
              ×
            </button>

            {/* Container */}
            <div className="grid md:grid-cols-2">
              {/* Left Side - Logo and Text */}
              <div className="bg-white p-12 flex flex-col items-center justify-center">
                <Image
                  src="/hero-icon.png"
                  alt="MenuQR Logo"
                  width={300}
                  height={240}
                  className="mb-8"
                />
                <h3 className="text-5xl font-bold text-[#111] mb-3 text-center">MenuQR</h3>
                <p className="text-2xl text-[#333] text-center font-semibold">Save Your Favorites!</p>
              </div>

              {/* Right Side - Registration Options (Red Background) */}
              <div className="bg-[#E23838] p-12 flex flex-col justify-center">
                {/* Title */}
                <h2 className="text-center text-4xl font-bold text-white mb-10">
                  Register as
                </h2>

                {/* Options Grid */}
                <div className="grid grid-cols-2 gap-6 mb-10">
                  {/* Business Owner Option */}
                  <Link
                    href="/signup-auth?role=owner"
                    onClick={() => handleSelectRole("owner")}
                    className="flex flex-col items-center p-8 bg-gray-300 rounded-2xl hover:bg-gray-400 transition-all duration-300 hover:scale-105 group cursor-pointer"
                  >
                    {/* Icon */}
                    <div className="mb-4 text-7xl">
                      🏪
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-bold text-[#111] text-center">
                      Business
                    </h3>
                  </Link>

                  {/* Menu Viewer Option */}
                  <Link
                    href="/signup-auth?role=user"
                    onClick={() => handleSelectRole("user")}
                    className="flex flex-col items-center p-8 bg-gray-300 rounded-2xl hover:bg-gray-400 transition-all duration-300 hover:scale-105 group cursor-pointer"
                  >
                    {/* Icon */}
                    <div className="mb-4 text-7xl">
                      👤
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-bold text-[#111] text-center">
                      User
                    </h3>
                  </Link>
                </div>

                {/* Description */}
                <p className="text-center text-white text-base leading-relaxed">
                  We offer two registration choices to ensure that both Business Owners get the management tools they need to update menus, and Customers get the personalized features needed to save and view their favorite spots.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
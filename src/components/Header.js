"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fetch = async () => {
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
      setRoleChecked(true);
    };
    fetch();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
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
      }
      setRoleChecked(true);
    });
    return () => listener.subscription.unsubscribe();
  }, [pathname]);

  const handleSelectRole = (role) => {
    sessionStorage.setItem("selectedRole", role);
    setShowModal(false);
  };

  const homeHref = "/";
  const dashboardHref =
    role === "owner"
      ? "/business/dashboard"
      : "/user-home";
  const dashboardLabel =
    role === "owner"
      ? "Menu Dashboard"
      : "My Dashboard";

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
              <Link
                href={homeHref}
                className={`transition hover:text-slate-900 ${pathname === homeHref ? "underline decoration-2 underline-offset-4" : ""}`}
              >
                Home
              </Link>
              {roleChecked && (
                <Link
                  href={dashboardHref}
                  className={`transition hover:text-slate-900 ${pathname.startsWith(dashboardHref) ? "underline decoration-2 underline-offset-4" : ""}`}
                >
                  {dashboardLabel}
                </Link>
              )}
              {user ? (
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
            {roleChecked && (
              <Link
                href={dashboardHref}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-[#102A43] transition hover:text-slate-900"
              >
                {dashboardLabel}
              </Link>
            )}
            {user && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="text-left text-sm font-semibold text-[#102A43] transition hover:text-slate-900"
              >
                Log out
              </button>
            )}
            {user ? (
              <Link
                href={dashboardHref}
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-2xl bg-[#102A43] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-300 transition hover:bg-slate-900"
              >
                Dashboard
              </Link>
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
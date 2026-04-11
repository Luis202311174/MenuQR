"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const [showModal, setShowModal] = useState(false);
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

  const homeHref =
    role === "owner"
      ? "/business/dashboard"
      : user
      ? "/user-home"
      : "/";
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
      <header className="bg-[#E23838] text-white">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href={homeHref}>
              <Image src="/logo.png" alt="MenuQR" width={68} height={48} />
            </Link>

            <Link href={homeHref} className="text-[#F2FF00] font-bold text-3xl md:text-4xl">
              MenuQR
            </Link>
          </div>

          {/* NAV */}
          <nav className="flex items-center gap-6 md:gap-8">
            {roleChecked && (
              <>
                <Link
                  href={homeHref}
                  className={`text-white font-bold text-lg hover:opacity-80 transition ${pathname === homeHref ? "underline" : ""}`}
                >
                  Home
                </Link>
                {user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      className={`text-white font-bold text-lg hover:opacity-80 transition ${pathname.startsWith(dashboardHref) ? "underline" : ""}`}
                    >
                      {dashboardLabel}
                    </Link>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = "/";
                      }}
                      className="text-[#F2FF00] font-bold text-lg hover:opacity-80 transition"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-[#F2FF00] font-bold text-lg hover:opacity-80 transition">
                      Log in
                    </Link>
                    <button
                      onClick={() => setShowModal(true)}
                      className="text-[#F2FF00] font-bold text-lg hover:opacity-80 transition"
                    >
                      Register
                    </button>
                  </>
                )}
              </>
            )}
          </nav>
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
"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import DynamicGreeting from "../components/DynamicGreeting";

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());

  const handleSelectRole = (role: string) => {
    sessionStorage.setItem("selectedRole", role);
    setShowModal(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user) {
        // check user role
        const { data: user } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.session.user.id)
          .single();
        if (user?.role === "owner") {
          router.push("/business");
          return;
        }
        setUserName(data.session.user.user_metadata?.full_name || data.session.user.email);
      } else {
        setUserName(null);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // check role on state change as well
        supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data: user }) => {
            if (user?.role === "owner") {
              router.push("/business");
              return;
            }
          });
        setUserName(session.user.user_metadata?.full_name || session.user.email);
      } else {
        setUserName(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  // Scroll Animation Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll("[data-scroll-animate]");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const isVisible = (id: string) => visibleElements.has(id);

  // removed unused mainContent variable; JSX is handled directly in return below


  return (
    <>
      <Head>
        <title>MenuQR - Digital Menus</title>
        <meta
          name="description"
          content="Your favorite menus, always in your pocket. Contactless and cloud-powered."
        />
      </Head>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#eef4ff] via-[#f9fbff] to-[#ffffff]">
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          [data-scroll-animate="fadeInUp"].visible {
            animation: fadeInUp 0.7s ease-out forwards;
          }

          [data-scroll-animate="fadeIn"].visible {
            animation: fadeIn 0.7s ease-out forwards;
          }

          [data-scroll-animate="slideInLeft"].visible {
            animation: slideInLeft 0.7s ease-out forwards;
          }
        `}</style>

        <main className="flex-1 relative z-10 overflow-y-auto">
          {session ? (
            /* logged in preview */
            <>
              {/* HERO SECTION */}
              <section className="min-h-screen flex items-center justify-center px-4 py-20 bg-[#eef4ff] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#ffffff]" />
                <div className="relative z-10 max-w-7xl w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-6 flex items-center justify-center relative">
                      <div className="rounded-full overflow-hidden w-80 h-80 sm:w-[420px] sm:h-[420px] bg-white shadow-[0_40px_90px_rgba(79,101,255,0.14)]">
                        <img
                          src="/usercircle.png"
                          alt="Dining scene"
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-6">
                      <div className="bg-white/95 p-8 sm:p-12 rounded-[2rem] shadow-[0_35px_90px_rgba(16,42,67,0.1)] ring-1 ring-[#d8e3f7]">
                        <p className="text-xs uppercase tracking-[0.45em] font-semibold text-[#4f65ff] mb-4">Welcome Back</p>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0b2136] leading-tight mb-6">
                          Hello, {userName || "Guest"}!
                        </h1>
                        <p className="text-base sm:text-lg text-[#42596b] leading-relaxed mb-8">
                          MenuQR is an intelligent engagement tool providing a seamless, contactless dining experience. Our platform brings your favorite menus straight to your phone, making it easier than ever to explore, save, and enjoy local eateries.
                        </p>
                        <a
                          href="/user-home"
                          className="inline-flex items-center justify-center px-7 py-4 rounded-full bg-[#4f65ff] text-white font-semibold shadow-lg hover:bg-[#3550d9] transition"
                        >
                          Browse Menus →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* FEATURES SECTION */}
              <section className="py-20 px-4 bg-[#f7fbff]">
                <div className="max-w-6xl mx-auto">
                  <div
                    className="text-center mb-16"
                    data-scroll-id="features-header"
                    data-scroll-animate="fadeInUp"
                  >
                    <p className="text-xs uppercase tracking-[0.45em] font-semibold text-[#4f65ff] mb-4">Why MenuQR is Great</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0b2136] mb-4">
                      Experience the platform that revolutionizes how you discover and enjoy local dining
                    </h2>
                    <p className="text-base sm:text-lg text-[#556d82] max-w-3xl mx-auto">
                      Intelligent digital menus, faster service, and a modern guest journey designed for restaurants and customers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div
                      className="bg-white rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] border border-[#d8e3f7]"
                      data-scroll-id="feature-1"
                      data-scroll-animate="fadeInUp"
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#eef4ff] text-[#4f65ff] mb-5">
                        QR
                      </div>
                      <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Easy Access</h3>
                      <p className="text-[#556d82] mb-8 leading-relaxed">
                        Find and access menus instantly via QR codes. No downloads needed, just scan and explore.
                      </p>
                      <a
                        href="/user-home"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full transition"
                      >
                        Explore Now →
                      </a>
                    </div>

                    <div
                      className="bg-white rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] border border-[#d8e3f7]"
                      data-scroll-id="feature-2"
                      data-scroll-animate="fadeInUp"
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#eef4ff] text-[#4f65ff] mb-5">
                        ♥
                      </div>
                      <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Save Favorites</h3>
                      <p className="text-[#556d82] mb-8 leading-relaxed">
                        Heart your favorite restaurants and access them anytime. Never lose a great spot again.
                      </p>
                      <a
                        href="/user-home"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full transition"
                      >
                        Go to Saved →
                      </a>
                    </div>

                    <div
                      className="bg-white rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] border border-[#d8e3f7]"
                      data-scroll-id="feature-3"
                      data-scroll-animate="fadeInUp"
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#eef4ff] text-[#4f65ff] mb-5">
                        ⚡
                      </div>
                      <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Live Updates</h3>
                      <p className="text-[#556d82] mb-8 leading-relaxed">
                        See the latest menus with real-time price updates. Always stay informed.
                      </p>
                      <a
                        href="/user-home"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full transition"
                      >
                        Browse All →
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA SECTION */}
              <section className="py-20 px-4 pb-32">
                <div className="max-w-4xl mx-auto">
                  <div
                    className="bg-white rounded-[2rem] p-10 sm:p-14 shadow-[0_28px_80px_rgba(79,101,255,0.12)] border border-[#d8e3f7] text-center"
                    data-scroll-id="cta"
                    data-scroll-animate="fadeInUp"
                  >
                    <p className="text-xs uppercase tracking-[0.4em] text-[#4f65ff] font-semibold mb-4">Ready to Explore?</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0b2136] mb-6">
                      Start browsing menus, saving your favorite restaurants, and discovering new dining experiences today.
                    </h2>
                    <p className="text-base text-[#556d82] mb-10 leading-relaxed">
                      Your personalized digital dining journey begins now—move from static menus to a smarter, connected experience.
                    </p>
                    <a
                      href="/user-home"
                      className="inline-flex items-center justify-center px-10 py-4 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full shadow-lg transition"
                    >
                      Go to Dashboard →
                    </a>
                  </div>
                </div>
              </section>
            </>
          ) : (
            /* unlogged landing page */
            <>
              {/* HERO SECTION */}
              <section
                className="min-h-screen flex items-center justify-center px-4 py-20 relative overflow-hidden bg-[#eef4ff]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#ffffff]" />
                <div className="relative z-10 max-w-7xl w-full">
                  <div
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                    data-scroll-id="hero-guest"
                    data-scroll-animate="fadeInUp"
                  >
                    {/* LEFT: Visual Anchor */}
                    <div className="lg:col-span-6 flex items-center justify-center">
                      <div className="relative">
                        <div className="rounded-full overflow-hidden w-80 h-80 sm:w-[420px] sm:h-[420px] bg-white flex items-center justify-center shadow-2xl">
                          <img
                            src="/circle.jpg"
                            alt="Dining scene"
                            className="object-cover w-full h-full"
                          />
                        </div>

                        {/* Small circular badge overlapping bottom-right */}
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#4f65ff] flex items-center justify-center shadow-lg">
                          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <path id="arc" d="M48 8a40 40 0 1 1 0 80a40 40 0 1 1 0-80Z" />
                            </defs>
                            <g transform="translate(0,0)">
                              <circle cx="48" cy="48" r="44" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                              <text fill="white" fontSize="8" fontWeight="700">
                                <textPath href="#arc" startOffset="5%">EXPLORE SMART MENUS •</textPath>
                              </text>
                              <g transform="translate(56,24) rotate(40)">
                                <path d="M0 8 L8 0 L16 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                <path d="M0 8 L8 0" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                              </g>
                            </g>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Typography & CTA */}
                    <div className="lg:col-span-6">
                      <div className="bg-white/95 p-8 sm:p-12 rounded-2xl shadow-xl ring-1 ring-[#d8e3f7]">
                        <p className="text-xs uppercase tracking-widest font-semibold mb-4 text-[#102A43]">WELCOME TO MENUQR</p>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold leading-tight text-[#0b2136] mb-6">
                          Stop Reprinting.
                          <br />
                          Start Connecting.
                        </h1>
                        <p className="text-base text-[#102A43] mb-6 leading-relaxed">
                          MenuQR is an intelligent engagement platform designed to help local eateries transition from static paper menus to a dynamic, cloud-native digital experience. From real-time menu updates to customer insights, MenuQR helps you engage guests more effectively.
                        </p>
                        <div className="flex items-start gap-4">
                          <button
                            type="button"
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-3 px-6 py-3 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full shadow-md transition"
                          >
                            Get started now →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Background accents: top-right dots and bottom-left dots */}
                  <div className="pointer-events-none">
                    <svg className="absolute top-8 right-8 opacity-10" width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs />
                      <g fill="#102A43">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const x = (i % 4) * 8;
                          const y = Math.floor(i / 4) * 8;
                          return <rect key={i} x={x} y={y} width="2" height="2" rx="1" />;
                        })}
                      </g>
                    </svg>

                    <svg className="absolute left-8 bottom-8 opacity-10" width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g fill="#102A43">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const x = (i % 4) * 8;
                          const y = Math.floor(i / 4) * 8;
                          return <rect key={i} x={x} y={y} width="2" height="2" rx="1" />;
                        })}
                      </g>
                    </svg>
                  </div>
                </div>
              </section>

              {/* FEATURES SECTION */}
              <section className="py-20 px-4 bg-[#f4f8ff]">
                <div className="max-w-6xl mx-auto">
                  <div
                    className="text-center mb-16 transition-all duration-700"
                    data-scroll-id="features-header-guest"
                    data-scroll-animate="fadeInUp"
                  >
                    <p className="text-xs uppercase tracking-[0.4em] font-semibold text-[#102A43] mb-4">Why MenuQR is Great</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0b2136] mb-4">
                      Experience the platform that revolutionizes how you discover and enjoy local dining
                    </h2>
                    <p className="text-base sm:text-lg text-[#42596b] max-w-2xl mx-auto">
                      Intelligent digital menus, fast customer engagement, and easy restaurant management in a modern cloud experience.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Easy Access Card */}
                    <div
                      className="bg-white border border-[#d8e3f7] rounded-3xl p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] transition duration-300 hover:-translate-y-1"
                      data-scroll-id="feature-guest-1"
                      data-scroll-animate="fadeInUp"
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#e8efff] text-[#4f65ff] mb-5">
                        <span className="text-lg">QR</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Easy Access</h3>
                      <p className="text-[#556d82] mb-8 leading-relaxed">
                        Find and access menus instantly via QR codes. No downloads needed, just scan and explore.
                      </p>
                      <a
                        href="/signup-auth?role=user"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full transition"
                      >
                        Explore Now →
                      </a>
                    </div>

                    {/* Save Favorites Card */}
                    <div
                      className="bg-white border border-[#d8e3f7] rounded-3xl p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] transition duration-300 hover:-translate-y-1"
                      data-scroll-id="feature-guest-2"
                      data-scroll-animate="fadeInUp"
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#e8efff] text-[#4f65ff] mb-5">
                        <span className="text-lg">♥</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Save Favorites</h3>
                      <p className="text-[#556d82] mb-8 leading-relaxed">
                        Heart your favorite restaurants and access them anytime. Never lose a great spot again.
                      </p>
                      <a
                        href="/signup-auth?role=user"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full transition"
                      >
                        Go to Saved →
                      </a>
                    </div>

                    {/* Live Updates Card */}
                    <div
                      className="bg-white border border-[#d8e3f7] rounded-3xl p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] transition duration-300 hover:-translate-y-1"
                      data-scroll-id="feature-guest-3"
                      data-scroll-animate="fadeInUp"
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#e8efff] text-[#4f65ff] mb-5">
                        <span className="text-lg">⚡</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Live Updates</h3>
                      <p className="text-[#556d82] mb-8 leading-relaxed">
                        See the latest menus with real-time price updates. Always stay informed.
                      </p>
                      <a
                        href="/signup-auth?role=user"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full transition"
                      >
                        Browse All →
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA SECTION */}
              <section className="py-20 px-4 pb-32">
                <div className="max-w-4xl mx-auto">
                  <div
                    className="bg-white border border-[#d8e3f7] rounded-[2rem] p-10 sm:p-14 shadow-[0_28px_80px_rgba(79,101,255,0.12)] text-center"
                    data-scroll-id="cta-guest"
                    data-scroll-animate="fadeInUp"
                  >
                    <p className="text-sm uppercase tracking-[0.4em] font-semibold text-[#102A43] mb-4">Ready to Explore?</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0b2136] mb-6">
                      Join MenuQR today and start exploring local dining experiences in a whole new way.
                    </h2>
                    <p className="text-base text-[#556d82] mb-10 leading-relaxed max-w-2xl mx-auto">
                      Start browsing menus, saving your favorite restaurants, and discovering local dining like never before.
                    </p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-flex items-center justify-center px-8 py-4 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full shadow-lg transition"
                    >
                      Get Started →
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>

        {/* REGISTER MODAL */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4 z-50">
            {/* Modal */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full relative">
              {/* Close button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white hover:text-gray-100 text-xl sm:text-2xl font-semibold z-10"
              >
                ×
              </button>

              {/* Container */}
              <div className="grid md:grid-cols-2">
                {/* Left Side - Logo and Text */}
                <div className="bg-white p-6 sm:p-12 flex flex-col items-center justify-center">
                  <Image
                    src="/hero-icon.png"
                    alt="MenuQR Logo"
                    width={240}
                    height={192}
                    className="w-40 h-32 sm:w-80 sm:h-60 mb-4 sm:mb-8"
                  />
                  <h3 className="text-3xl sm:text-5xl font-bold text-[#111] mb-2 sm:mb-3 text-center">MenuQR</h3>
                  <p className="text-lg sm:text-2xl text-[#333] text-center font-semibold">Save Your Favorites!</p>
                </div>

                {/* Right Side - Registration Options (Brand Blue Theme) */}
                <div className="bg-[#102A43] p-6 sm:p-12 flex flex-col justify-center rounded-tr-3xl rounded-br-3xl">
                  {/* Title */}
                  <h2 className="text-center text-2xl sm:text-4xl font-bold text-white mb-6 sm:mb-10">
                    Register as
                  </h2>

                  {/* Options Grid */}
                  <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
                    {/* Business Owner Option */}
                    <Link
                      href="/signup-auth?role=owner"
                      onClick={() => handleSelectRole("owner")}
                      className="flex flex-col items-center p-5 sm:p-8 bg-[#f3f7ff] rounded-3xl hover:bg-[#e4eafc] transition-all duration-300 hover:-translate-y-1 shadow-md cursor-pointer"
                    >
                      {/* Icon */}
                      <div className="mb-2 sm:mb-4 text-5xl sm:text-7xl text-[#4f65ff]">
                        🏪
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-xl font-bold text-[#102A43] text-center">
                        Business
                      </h3>
                    </Link>

                    {/* Menu Viewer Option */}
                    <Link
                      href="/signup-auth?role=user"
                      onClick={() => handleSelectRole("user")}
                      className="flex flex-col items-center p-5 sm:p-8 bg-[#f3f7ff] rounded-3xl hover:bg-[#e4eafc] transition-all duration-300 hover:-translate-y-1 shadow-md cursor-pointer"
                    >
                      {/* Icon */}
                      <div className="mb-2 sm:mb-4 text-5xl sm:text-7xl text-[#4f65ff]">
                        👤
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-xl font-bold text-[#102A43] text-center">
                        User
                      </h3>
                    </Link>
                  </div>

                  {/* Description */}
                  <p className="text-center text-[#c7d4eb] text-sm sm:text-base leading-relaxed">
                    Choose the right path for your journey: business owners get management tools for menus, while customers get personalized discovery and favorites.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
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

      <div
        className="flex flex-col min-h-screen bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url('/hpbg.png')" }}
      >
        {/* Subtle overlay to darken background slightly */}
        <div className="fixed inset-0 bg-black/20 pointer-events-none" />

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
              <section className="min-h-screen flex items-center justify-center px-4 py-20">
                <div className="max-w-3xl w-full space-y-8">
                  {/* Card 1: Text Content */}
                  <div
                    className="relative backdrop-blur-md bg-black/60 border border-white/20 rounded-3xl p-12 lg:p-16 shadow-2xl transition-all duration-700"
                    data-scroll-id="hero"
                    data-scroll-animate="fadeInUp"
                  >
                    <div className="flex flex-col items-center text-center lg:text-left">
                      <div
                        className="w-full transition-all duration-700"
                        data-scroll-id="hero-text"
                        data-scroll-animate="slideInLeft"
                      >
                        <p className="text-sm uppercase tracking-[0.3em] font-semibold text-white/80 mb-4">Welcome Back</p>
                        <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-lg">
                          Hello, {userName || "Guest"}!
                        </h1>
                        <p className="text-lg text-white/90 leading-relaxed mb-8">
                          MenuQR is an intelligent engagement tool providing a seamless, contactless dining experience. Our platform brings your favorite menus straight to your phone, making it easier than ever to explore, save, and enjoy local eateries.
                        </p>
                        <a
                          href="/user-home"
                          className="inline-block px-8 py-4 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-full transition duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 backdrop-blur-sm"
                        >
                          Browse Menus →
                        </a>
                      </div>
                    </div>
                  </div>


                </div>
              </section>

              {/* FEATURES SECTION */}
              <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                  <div
                    className="text-center mb-16 transition-all duration-700"
                    data-scroll-id="features-header"
                    data-scroll-animate="fadeInUp"
                  >
                    <h2 className="text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">Why MenuQR is Great</h2>
                    <p className="text-lg text-white/80 max-w-2xl mx-auto">
                      Experience the platform that revolutionizes how you discover and enjoy local dining
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Easy Access Card */}
                    <div
                      className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                      data-scroll-id="feature-1"
                      data-scroll-animate="fadeInUp"
                    >
                      <h3 className="text-2xl font-bold text-white mb-4">Easy Access</h3>
                      <p className="text-white/80 mb-6 leading-relaxed">
                        Find and access menus instantly via QR codes. No downloads needed, just scan and explore.
                      </p>
                      <a
                        href="/user-home"
                        className="inline-block px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-lg transition duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:translate-x-1"
                      >
                        Explore Now →
                      </a>
                    </div>

                    {/* Save Favorites Card */}
                    <div
                      className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                      data-scroll-id="feature-2"
                      data-scroll-animate="fadeInUp"
                    >
                      <h3 className="text-2xl font-bold text-white mb-4">Save Favorites</h3>
                      <p className="text-white/80 mb-6 leading-relaxed">
                        Heart your favorite restaurants and access them anytime. Never lose a great spot again.
                      </p>
                      <a
                        href="/user-home"
                        className="inline-block px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-lg transition duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:translate-x-1"
                      >
                        Go to Saved →
                      </a>
                    </div>

                    {/* Live Updates Card */}
                    <div
                      className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                      data-scroll-id="feature-3"
                      data-scroll-animate="fadeInUp"
                    >
                      <h3 className="text-2xl font-bold text-white mb-4">Live Updates</h3>
                      <p className="text-white/80 mb-6 leading-relaxed">
                        See the latest menus with real-time price updates. Always stay informed.
                      </p>
                      <a
                        href="/user-home"
                        className="inline-block px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-lg transition duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:translate-x-1"
                      >
                        Browse All →
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA SECTION */}
              <section className="py-20 px-4 pb-32">
                <div className="max-w-3xl mx-auto">
                  <div
                    className="backdrop-blur-md bg-black/40 border border-white/20 rounded-3xl p-16 text-center hover:bg-black/50 hover:border-white/40 transition duration-300 transform hover:-translate-y-2 transition-all duration-700"
                    data-scroll-id="cta"
                    data-scroll-animate="fadeInUp"
                  >
                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 drop-shadow-lg">Ready to Explore?</h2>
                    <p className="text-lg text-white/80 mb-10 leading-relaxed">
                      Start browsing menus, saving your favorite restaurants, and discovering new dining experiences today.
                    </p>
                    <a
                      href="/user-home"
                      className="inline-block px-10 py-4 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-bold text-lg rounded-full transition duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-105"
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
              <section className="min-h-screen flex items-center justify-center px-4 py-20">
                <div className="max-w-5xl w-full">
                  {/* Glass Card */}
                  <div
                    className="relative backdrop-blur-md bg-black/60 border border-white/20 rounded-3xl p-12 lg:p-16 shadow-2xl transition-all duration-700"
                    data-scroll-id="hero-guest"
                    data-scroll-animate="fadeInUp"
                  >
                    <div className="flex flex-col items-center text-center lg:text-left">
                      {/* HERO TEXT CONTENT */}
                      <div
                        className="max-w-2xl mb-12 transition-all duration-700"
                        data-scroll-id="hero-guest-text"
                        data-scroll-animate="slideInLeft"
                      >
                        <p className="text-sm uppercase tracking-[0.3em] font-semibold text-white/80 mb-4">Welcome</p>
                        <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-lg">
                          Your Favorite Menus,<br />
                          <span className="text-white/80">Always in Your Pocket.</span>
                        </h1>
                        <p className="text-lg text-white/90 leading-relaxed mb-8">
                          The simplest way for customers to browse, save, and stay connected to the food they love. Discover local eateries with just a scan.
                        </p>
                        <button
                          onClick={() => setShowModal(true)}
                          className="inline-block px-8 py-4 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-full transition duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 backdrop-blur-sm cursor-pointer"
                        >
                          Get Started →
                        </button>
                      </div>

                      {/* LOGO BELOW */}
                      <div
                        className="w-32 h-32 lg:w-40 lg:h-40 relative opacity-90 hover:opacity-100 transition-all duration-500 transform hover:scale-105 transition-all duration-700"
                        data-scroll-id="hero-guest-logo"
                        data-scroll-animate="fadeIn"
                      >
                        <Image src="/logowhite.png" alt="MenuQR Logo" fill className="object-contain drop-shadow-lg" />
                      </div>

                      {/* TAGLINE BELOW LOGO */}
                      <div
                        className="mt-12 text-center max-w-xl transition-all duration-700"
                        data-scroll-id="hero-guest-tagline"
                        data-scroll-animate="fadeInUp"
                      >
                        <p className="text-2xl lg:text-3xl font-bold text-white leading-tight">
                          Seamless Dining<br />
                          <span className="text-white/80">Contactless Experience</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* FEATURES SECTION */}
              <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                  <div
                    className="text-center mb-16 transition-all duration-700"
                    data-scroll-id="features-header-guest"
                    data-scroll-animate="fadeInUp"
                  >
                    <h2 className="text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">Why MenuQR is Great</h2>
                    <p className="text-lg text-white/80 max-w-2xl mx-auto">
                      Experience the platform that revolutionizes how you discover and enjoy local dining
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Easy Access Card */}
                    <div
                      className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                      data-scroll-id="feature-guest-1"
                      data-scroll-animate="fadeInUp"
                    >
                      <h3 className="text-2xl font-bold text-white mb-4">Easy Access</h3>
                      <p className="text-white/80 mb-6 leading-relaxed">
                        Find and access menus instantly via QR codes. No downloads needed, just scan and explore.
                      </p>
                      <a
                        href="/signup-auth?role=user"
                        className="inline-block px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-lg transition duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:translate-x-1"
                      >
                        Explore Now →
                      </a>
                    </div>

                    {/* Save Favorites Card */}
                    <div
                      className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                      data-scroll-id="feature-guest-2"
                      data-scroll-animate="fadeInUp"
                    >
                      <h3 className="text-2xl font-bold text-white mb-4">Save Favorites</h3>
                      <p className="text-white/80 mb-6 leading-relaxed">
                        Heart your favorite restaurants and access them anytime. Never lose a great spot again.
                      </p>
                      <a
                        href="/signup-auth?role=user"
                        className="inline-block px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-lg transition duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:translate-x-1"
                      >
                        Go to Saved →
                      </a>
                    </div>

                    {/* Live Updates Card */}
                    <div
                      className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                      data-scroll-id="feature-guest-3"
                      data-scroll-animate="fadeInUp"
                    >
                      <h3 className="text-2xl font-bold text-white mb-4">Live Updates</h3>
                      <p className="text-white/80 mb-6 leading-relaxed">
                        See the latest menus with real-time price updates. Always stay informed.
                      </p>
                      <a
                        href="/signup-auth?role=user"
                        className="inline-block px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-lg transition duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:translate-x-1"
                      >
                        Browse All →
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA SECTION */}
              <section className="py-20 px-4 pb-32">
                <div className="max-w-3xl mx-auto">
                  <div
                    className="backdrop-blur-md bg-black/40 border border-white/20 rounded-3xl p-16 text-center hover:bg-black/50 hover:border-white/40 transition duration-300 transform hover:-translate-y-2 transition-all duration-700"
                    data-scroll-id="cta-guest"
                    data-scroll-animate="fadeInUp"
                  >
                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 drop-shadow-lg">Ready to Explore?</h2>
                    <p className="text-lg text-white/80 mb-10 leading-relaxed">
                      Join MenuQR today and start exploring local dining experiences in a whole new way.
                    </p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-block px-10 py-4 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-bold text-lg rounded-full transition duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-105 cursor-pointer"
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
      </div>
    </>
  );
}
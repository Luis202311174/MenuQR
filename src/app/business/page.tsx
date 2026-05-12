"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function BusinessLanding() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;

        if (!sessionUser) {
          router.push("/");
          return;
        }

        const { data: userRecord, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", sessionUser.id)
          .single();

        if (userError || !userRecord || userRecord.role !== "owner") {
          router.push("/");
          return;
        }

        const { data: businessRecord, error: businessError } = await supabase
          .from("businesses")
          .select("name, logo_url")
          .eq("owner_id", sessionUser.id)
          .single();

        if (!businessError && businessRecord) {
          setBusinessName(businessRecord.name);
          setBusinessLogoUrl(businessRecord.logo_url);
        }
      } catch (err) {
        console.error("Error loading business landing:", err);
        router.push("/");
      }
    };

    loadBusiness();
  }, [router]);

  return (
    <>
      <Head>
        <title>MenuQR Business Account</title>
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
          {/* HERO SECTION */}
          <section className="min-h-screen flex items-center justify-center px-4 py-20">
            <div className="max-w-4xl w-full flex justify-center">
              {/* Main Card - Centered */}
              <div
                className="relative backdrop-blur-md bg-black/60 border border-white/20 rounded-3xl p-6 sm:p-8 lg:p-20 shadow-2xl transition-all duration-700 flex flex-col lg:flex-row items-center gap-6 lg:gap-10 w-full"
                data-scroll-id="hero-main-card"
                data-scroll-animate="fadeInUp"
              >
                {/* Logo */}
                <div
                  className="w-24 h-24 sm:w-32 sm:h-32 lg:w-48 lg:h-48 relative opacity-90 hover:opacity-100 transition-all duration-500 transform hover:scale-105 flex-shrink-0"
                  data-scroll-id="hero-logo"
                  data-scroll-animate="fadeIn"
                >
                  <Image
                    src={businessLogoUrl || "/hero-icon.png"}
                    alt={`${businessName} Logo`}
                    fill
                    className="object-contain drop-shadow-lg rounded-lg border border-white/20"
                  />
                </div>

                {/* Welcome Text */}
                <div
                  className="transition-all duration-700 text-center lg:text-left flex-1"
                  data-scroll-id="hero-welcome"
                  data-scroll-animate="fadeInUp"
                >
                  <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-semibold text-white/80 mb-2 sm:mb-3">Welcome to MenuQR</p>
                  <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white leading-tight mb-2 sm:mb-3 drop-shadow-lg">
                    {businessName || "Business Account"}
                  </h1>
                  <p className="text-xs sm:text-base lg:text-lg text-white/90 leading-relaxed mb-6 sm:mb-8">
                    Modernizing Menus, Streamlining Service. Intelligent menu management for a smarter, faster dining experience. The simplest way for customers to browse, save, and stay connected to the food they love.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                    <Link
                      href="/business/dashboard"
                      className="inline-flex justify-center items-center px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold text-sm sm:text-base rounded-full transition duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 backdrop-blur-sm"
                    >
                      Create your menu →
                    </Link>
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
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">Why Use MenuQR?</h2>
                <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto">
                  Transform your business with intelligent menu management
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div
                    className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-5 sm:p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                    data-scroll-id="feature-1"
                    data-scroll-animate="fadeInUp"
                  >
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Update Instantly, Save Money</h3>
                    <p className="text-sm sm:text-base text-white/80 mb-6 leading-relaxed">
                      No more reprinting menus. Use your Control Center to change prices, add new dishes, or mark items as "Sold Out" in real-time.
                    </p>
                </div>

                {/* Feature 2 */}
                <div
                    className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-5 sm:p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                    data-scroll-id="feature-2"
                    data-scroll-animate="fadeInUp"
                  >
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Get Discovered by Foodies</h3>
                    <p className="text-sm sm:text-base text-white/80 mb-6 leading-relaxed">
                      Your business gets featured in Smart Suggestions and trending local lists. Cloud-native intelligence recommends your dishes to hungry customers.
                    </p>
                </div>

                {/* Feature 3 */}
                <div
                    className="backdrop-blur-md bg-black/40 border border-white/20 rounded-2xl p-5 sm:p-8 hover:bg-black/50 hover:border-white/40 transition duration-300 group transform hover:-translate-y-2 transition-all duration-700"
                    data-scroll-id="feature-3"
                    data-scroll-animate="fadeInUp"
                  >
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Stay Connected to Customers</h3>
                    <p className="text-sm sm:text-base text-white/80 mb-6 leading-relaxed">
                      Allow customers to save your menu to their favorites. Keep your business one tap away from their smartphone.
                    </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA SECTION */}
          <section className="py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div
                className="relative backdrop-blur-md bg-black/60 border border-white/20 rounded-3xl p-6 sm:p-10 lg:p-16 shadow-2xl transition-all duration-700"
                data-scroll-id="cta"
                data-scroll-animate="fadeInUp"
              >
                <div className="text-center space-y-8">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] font-semibold text-white/80 mb-4">Learn More</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-lg">
                      Stop Reprinting. Start Connecting.
                    </h2>
                  </div>
                  <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto">
                    MenuQR is an intelligent engagement platform designed to help local eateries transition from static paper menus to a dynamic, cloud-native digital experience. By digitizing your menu, you gain a powerful Control Center and help customers discover you.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/business/dashboard"
                      className="inline-flex justify-center items-center px-6 py-3 sm:px-8 sm:py-4 bg-white/20 hover:bg-white/30 border border-white/40 hover:border-white/60 text-white font-semibold rounded-full transition duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 backdrop-blur-sm"
                    >
                      Get started now →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

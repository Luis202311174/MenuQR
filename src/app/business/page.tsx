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

      <div className="flex flex-col min-h-screen bg-[#eef4ff]">
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
          <section className="min-h-screen flex items-center justify-center px-4 py-20 bg-[#eef4ff] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#ffffff]" />
            <div className="relative z-10 max-w-7xl w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-6 flex items-center justify-center">
                  <div className="rounded-full overflow-hidden w-80 h-80 sm:w-[420px] sm:h-[420px] bg-white shadow-[0_40px_90px_rgba(79,101,255,0.14)]">
                    <img
                      src={businessLogoUrl || "/hero-icon.png"}
                      alt={`${businessName || "Business"} Profile`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="bg-white/95 p-8 sm:p-12 rounded-[2rem] shadow-[0_35px_90px_rgba(16,42,67,0.1)] ring-1 ring-[#d8e3f7]">
                    <p className="text-xs uppercase tracking-[0.45em] font-semibold text-[#4f65ff] mb-4">Welcome to MenuQR</p>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0b2136] leading-tight mb-6">
                      {businessName || "LNA Cafe"}
                    </h1>
                    <p className="text-base sm:text-lg text-[#42596b] leading-relaxed mb-8">
                      Modernizing Menus, Streamlining Service. Intelligent menu management for a smarter, faster dining experience. The simplest way for customers to browse, save, and stay connected to the food they love.
                    </p>
                    <div className="flex">
                      <Link
                        href="/business/dashboard"
                        className="inline-flex items-center justify-center px-7 py-4 rounded-full bg-[#4f65ff] text-white font-semibold shadow-lg hover:bg-[#3550d9] transition"
                      >
                        Create your menu →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURES SECTION */}
          <section className="py-20 px-4 bg-[#f7fbff]">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16" data-scroll-id="features-header" data-scroll-animate="fadeInUp">
                <p className="text-xs uppercase tracking-[0.45em] font-semibold text-[#4f65ff] mb-4">Why Use MenuQR?</p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0b2136] mb-4">
                  Transform your business with intelligent menu management
                </h2>
                <p className="text-base sm:text-lg text-[#556d82] max-w-3xl mx-auto">
                  Smart tools that help you update menus instantly, attract customers, and keep your restaurant connected.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] border border-[#d8e3f7]" data-scroll-id="feature-1" data-scroll-animate="fadeInUp">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#eef4ff] text-[#4f65ff] mb-5">
                    <span className="text-lg">⚡</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Update Instantly, Save Money</h3>
                  <p className="text-[#556d82] leading-relaxed">
                    No more reprinting menus. Use your Control Center to change prices, add new dishes, or mark items as "Sold Out" in real-time.
                  </p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] border border-[#d8e3f7]" data-scroll-id="feature-2" data-scroll-animate="fadeInUp">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#eef4ff] text-[#4f65ff] mb-5">
                    <span className="text-lg">🔥</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Get Discovered by Foodies</h3>
                  <p className="text-[#556d82] leading-relaxed">
                    Your business gets featured in Smart Suggestions and trending local lists. Cloud-native intelligence recommends your dishes to hungry customers.
                  </p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(79,101,255,0.12)] border border-[#d8e3f7]" data-scroll-id="feature-3" data-scroll-animate="fadeInUp">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#eef4ff] text-[#4f65ff] mb-5">
                    <span className="text-lg">🤝</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#102A43] mb-4">Stay Connected to Customers</h3>
                  <p className="text-[#556d82] leading-relaxed">
                    Allow customers to save your menu to their favorites. Keep your business one tap away from their smartphone.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA SECTION */}
          <section className="py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-[2rem] p-10 sm:p-14 shadow-[0_28px_80px_rgba(79,101,255,0.12)] border border-[#d8e3f7] text-center" data-scroll-id="cta" data-scroll-animate="fadeInUp">
                <p className="text-xs uppercase tracking-[0.4em] text-[#4f65ff] font-semibold mb-4">Learn More</p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0b2136] mb-6">
                  Stop Reprinting. Start Connecting.
                </h2>
                <p className="text-base text-[#556d82] mb-10 leading-relaxed">
                  MenuQR is an intelligent engagement platform designed to help local eateries transition from static paper menus to a dynamic, cloud-native digital experience. By digitizing your menu, you gain a powerful Control Center and help customers discover you.
                </p>
                <Link
                  href="/business/dashboard"
                  className="inline-flex items-center justify-center px-10 py-4 bg-[#4f65ff] hover:bg-[#3550d9] text-white font-semibold rounded-full shadow-lg transition"
                >
                  Get started now →
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

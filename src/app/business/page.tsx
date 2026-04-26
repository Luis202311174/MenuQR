"use client";

import Head from "next/head";
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

      <div className="min-h-screen bg-[#F4F3ED] text-slate-900 py-8 px-4">
        {/* Hero Section */}
        <section className="w-full max-w-[1400px] mx-auto mb-12">
          <div className="rounded-[32px] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
              {/* Left: Logo and Business Name */}
              <div className="flex flex-col items-center text-center">
                {businessName ? (
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 w-fit mx-auto">
                      <img
                        src={businessLogoUrl || "/hero-icon.png"}
                        alt={`${businessName} Logo`}
                        className="w-48 h-auto object-contain"
                      />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                      {businessName}
                    </h2>
                  </div>
                ) : (
                  <>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 w-fit mx-auto">
                      <img
                        src="/hero-icon.png"
                        alt="MenuQR Logo"
                        className="w-48 h-auto object-contain"
                      />
                    </div>
                    <p className="text-lg font-semibold text-slate-500 mt-4">Loading...</p>
                  </>
                )}
              </div>

              {/* Right: Welcome Message */}
              <div className="space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">Welcome to MenuQR</p>
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mt-1">
                    Modernizing Menus, Streamlining Service.
                  </h1>
                </div>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Intelligent menu management for a smarter, faster dining experience. The simplest way for customers to browse, save, and stay connected to the food they love.
                </p>
                <Link
                  href="/business/dashboard"
                  className="inline-flex items-center justify-center rounded-3xl bg-[#E23838] px-8 py-4 text-base font-bold text-[#F2FF00] transition hover:bg-[#c22f2f] w-full sm:w-auto"
                >
                  Create your menu
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full max-w-[1400px] mx-auto mb-12">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Why Use MenuQR?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Update Instantly, Save Money</h3>
              <p className="text-slate-600 leading-relaxed">
                No more reprinting menus. Use your Control Center to change prices, add new dishes, or mark items as "Sold Out" in real-time. Print once, update forever.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Get Discovered by Foodies</h3>
              <p className="text-slate-600 leading-relaxed">
                Your business gets featured in Smart Suggestions and trending local lists. Cloud-native intelligence recommends your dishes to hungry customers in your area.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Stay Connected to Customers</h3>
              <p className="text-slate-600 leading-relaxed">
                Allow customers to "Heart" your restaurant and save your menu to their favorites. Keep your business one tap away from their smartphone.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full max-w-[1400px] mx-auto">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 md:p-12 shadow-sm">
            <div className="space-y-8">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">Learn More</p>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Stop Reprinting. Start Connecting.
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <p className="text-lg text-slate-600 leading-relaxed">
                  MenuQR is an intelligent engagement platform designed to help local eateries transition from static paper menus to a dynamic, cloud-native digital experience. By digitizing your menu, you gain a powerful Control Center where you can update prices, add seasonal dishes, or mark items as "Sold Out" in real-time.
                </p>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Beyond simple menu viewing, MenuQR bridges the gap between you and your diners by allowing them to save your menu directly to their smartphones. This keeps your business at the top of their minds and helps you get discovered by new customers. Modernize your service and streamline your workflow.
                </p>
              </div>
              <Link
                href="/business/dashboard"
                className="inline-flex items-center justify-center rounded-3xl bg-[#E23838] px-8 py-4 text-base font-bold text-[#F2FF00] transition hover:bg-[#c22f2f]"
              >
                Get started now
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

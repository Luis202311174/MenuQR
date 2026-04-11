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

      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFBF4] text-[#333] py-16">
        <header className="w-full max-w-[1400px] mb-12">
          <div className="flex flex-col md:flex-row items-center">
            {/* left: user uploaded logo with business name */}
            <div className="flex-1 flex flex-col justify-center items-center mb-8 md:mb-0">
              {businessName ? (
                <div className="flex flex-col items-center">
                  <img
                    src={businessLogoUrl || "/hero-icon.png"}
                    alt={`${businessName} Logo`}
                    className="w-64 h-auto md:w-72 md:h-auto object-contain"
                  />
                  <p className="text-4xl md:text-5xl font-bold text-center max-w-xs">
                    {businessName}
                  </p>
                </div>
              ) : (
                <>
                  <img
                    src="/hero-icon.png"
                    alt="MenuQR Logo"
                    className="w-64 h-auto md:w-72 md:h-auto object-contain"
                  />
                  <p className="text-2xl md:text-3xl mt-4 font-bold text-center max-w-xs">
                    Loading...
                  </p>
                </>
              )}
            </div>

            {/* right: updated business welcome and messaging */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Welcome!
              </h1>
              <p className="text-2xl md:text-3xl mt-4 font-bold">
                Modernizing Menus, Streamlining Service.
              </p>
              <p className="text-lg md:text-xl mt-2 text-gray-600 max-w-prose mx-auto md:mx-0">
                Intelligent menu management for a smarter, faster dining experience.
              </p>
              <div className="w-20 h-1 bg-black mt-4 mx-auto md:mx-0"></div>
              <p className="text-lg md:text-xl mt-4 text-gray-600 max-w-prose mx-auto md:mx-0">
                The simplest way for customers to browse, save, and stay connected to the food they love.
              </p>
              <div className="mt-8">
                <Link
                  href="/business/dashboard"
                  className="inline-block bg-[#E23838] text-[#F2FF00] font-bold px-8 py-4 rounded-full shadow-[0_6px_0_#a82626] hover:shadow-[0_4px_0_#a82626] transition-all"
                >
                  Create your menu!
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* business features section */}
        <section className="w-full bg-[#E23838] text-white px-4 py-12">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 drop-shadow-lg">Why Use MenuQR?</h2>
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
              <article className="bg-[#F2FF00] p-6 rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
                <h3 className="text-2xl font-semibold mb-3 text-[#333]">Update Instantly, Save Money</h3>
                <p className="text-[#333]">
                  No more reprinting menus. Use your "Control Center" to change prices,
                  add new dishes, or mark items as "Sold Out" in real-time. Since our QR
                  codes are dynamic, you print your table stickers once and update your
                  digital menu forever.
                </p>
              </article>

              <article className="bg-[#F2FF00] p-6 rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
                <h3 className="text-2xl font-semibold mb-3 text-[#333]">Get Discovered by Local Foodies</h3>
                <p className="text-[#333]">
                  Reach more hungry people. Your business gets featured in our "Smart
                  Suggestions" and "Most Visited" sections. We use cloud-native
                  intelligence to recommend your trending dishes to users looking for
                  their next favorite meal in the area.
                </p>
              </article>

              <article className="bg-[#F2FF00] p-6 rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
                <h3 className="text-2xl font-semibold mb-3 text-[#333]">Stay Connected to Your Customers</h3>
                <p className="text-[#333]">
                  Go beyond a simple scan. MenuQR allows food lovers to "Heart" your
                  restaurant, saving your menu directly to their personal favorites
                  list. This keeps your business just one tap away on their smartphone,
                  even after they leave your shop.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* explanation section */}
        <section className="w-full bg-[#FCFBF4] text-[#333] px-4 py-12">
          <div className="max-w-[1200px] mx-auto">
            {/* card container for text with subtitle header */}
            <div className="bg-white p-10 rounded-2xl shadow-md">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
                Stop Reprinting. Start Connecting.
              </h2>
              <div className="md:flex md:space-x-10">
                <div className="md:flex-1">
                  <p className="text-lg md:text-xl leading-relaxed text-left">
                    MenuQR is an intelligent engagement platform designed to help local
                    eateries transition from static paper menus to a dynamic, cloud-native
                    digital experience. By digitizing your menu, you gain a powerful Control
                    Center where you can update prices, add seasonal dishes, or mark items as
                    "Sold Out" in real-time, ensuring your customers always see the most
                    accurate information. Our technology uses dynamic QR codes, meaning you
                    only need to print your table stickers once—any changes you make in the
                    dashboard are instantly updated in the cloud.
                  </p>
                </div>
                <div className="md:flex-1 mt-6 md:mt-0">
                  <p className="text-lg md:text-xl leading-relaxed text-left">
                    Beyond simple menu viewing, MenuQR bridges the gap between you and your
                    diners by allowing them to "Heart" your shop and save your menu directly
                    to their smartphones for quick access later. This keeps your business at
                    the top of their minds and helps you get discovered by new customers
                    through our Smart Suggestions and trending local lists. Modernize your
                    service, eliminate reprinting costs, and streamline your workflow with a
                    tool built for the future of dining.
                  </p>
                </div>
              </div>
              <div className="mt-8 text-center">
                <Link
                  href="/business/dashboard"
                  className="inline-block bg-[#E23838] text-[#F2FF00] font-bold px-8 py-4 rounded-full shadow-[0_6px_0_#a82626] hover:shadow-[0_4px_0_#a82626] transition-all"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

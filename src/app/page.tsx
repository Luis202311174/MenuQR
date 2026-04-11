"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import DynamicGreeting from "../components/DynamicGreeting";

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);

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

      <div className="flex flex-col min-h-screen bg-[#FCFBF4] text-[#333]">

        <main className="flex-1 pt-8">
          {session ? (
            /* logged in preview */
            <>
              {/* split hero for logged users */}
              <section className="grid md:grid-cols-2 gap-8 items-center max-w-[1000px] mx-auto px-4 py-12 bg-[#FCFBF4]">
                <div className="text-left">
                  <h2 className="text-4xl font-bold mb-2">
                    Welcome, {userName || "Guest"}!
                  </h2>
                  <p className="text-lg text-[#444] mb-4">
                    MenuQR is an intelligent engagement tool providing a seamless,
                    contactless dining experience. Our platform brings your
                    favorite menus straight to your phone, making it easier than
                    ever to explore, save, and enjoy local eateries.
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <Image src="/hero-icon.png" alt="MenuQR Logo" width={300} height={300} />
                  <p className="text-xl font-semibold mt-4 text-center">
                    Your Favorite Menus,
                    <br />
                    Always in Your Pocket.
                  </p>
                </div>
              </section>

              {/* BENEFITS SECTION */}
              <section className="px-4 py-12 bg-[#fafafa]">
                <h2 className="text-center text-3xl font-bold mb-8">Why Use MenuQR?</h2>
                <div className="flex flex-col md:flex-row gap-6 max-w-[1000px] mx-auto">
                  <article className="flex-1 bg-[#E23838] text-white p-8 rounded-2xl shadow-[0_12px_24px_rgba(226,56,56,0.3)] hover:shadow-[0_16px_32px_rgba(226,56,56,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-2xl font-bold mb-4">Easy Access</h3>
                    <p className="text-white/90 text-base leading-relaxed mb-6">
                      Helps you find and access menus instantly via QR.
                    </p>
                    <a href="#" className="inline-block bg-[#F2FF00] text-[#E23838] font-bold px-5 py-3 rounded-lg shadow-[0_4px_0_#d4dd00] hover:shadow-[0_2px_0_#d4dd00] hover:translate-y-[2px] transition-all">
                      Scan Now
                    </a>
                  </article>
                  <article className="flex-1 bg-[#E23838] text-white p-8 rounded-2xl shadow-[0_12px_24px_rgba(226,56,56,0.3)] hover:shadow-[0_16px_32px_rgba(226,56,56,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-2xl font-bold mb-4">Portable</h3>
                    <p className="text-white/90 text-base leading-relaxed mb-6">
                      Put the menu in your smartphone pocket.
                    </p>
                    <a href="#" className="inline-block bg-[#F2FF00] text-[#E23838] font-bold px-5 py-3 rounded-lg shadow-[0_4px_0_#d4dd00] hover:shadow-[0_2px_0_#d4dd00] hover:translate-y-[2px] transition-all">
                      View Sample
                    </a>
                  </article>
                  <article className="flex-1 bg-[#E23838] text-white p-8 rounded-2xl shadow-[0_12px_24px_rgba(226,56,56,0.3)] hover:shadow-[0_16px_32px_rgba(226,56,56,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-2xl font-bold mb-4">Smart Picks</h3>
                    <p className="text-white/90 text-base leading-relaxed mb-6">
                      Offers smart suggestions based on the most visited menus.
                    </p>
                    <a href="#" className="inline-block bg-[#F2FF00] text-[#E23838] font-bold px-5 py-3 rounded-lg shadow-[0_4px_0_#d4dd00] hover:shadow-[0_2px_0_#d4dd00] hover:translate-y-[2px] transition-all">
                      Explore Trending
                    </a>
                  </article>
                </div>
              </section>

              {/* informational section (logged) */}
              <section className="px-4 py-16">
                <div className="text-center mt-12 max-w-prose mx-auto">
                  <p className="text-xl text-[#333]">
                    MenuQR is your Digital Dining Assistant — browse menus, save favorites, and stay connected to local eateries with one tap.
                  </p>
                </div>
              </section>
            </>
          ) : (
            /* unlogged landing page */
            <> {/* original hero etc continues unchanged below this comment */}
              {/* HERO SECTION */}
              <section className="grid md:grid-cols-2 gap-8 items-center max-w-[1000px] mx-auto px-4 py-12 text-center md:text-left">
                <div className="order-2 md:order-1">
                  <Image
                    src="/hero-icon.png"
                    alt="MenuQR Icon"
                    width={320}
                    height={240}
                    priority
                    className="mx-auto md:mx-0"
                  />
                </div>

                <div className="order-1 md:order-2">
                  <h2 className="text-4xl md:text-5xl font-bold text-[#111] mb-4">
                    Your Favorite Menus, Always in Your Pocket.
                  </h2>
                  <p className="text-lg text-[#444] mb-6">
                    The simplest way for customers to browse, save, and stay connected to the food they love.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-block bg-[#E23838] text-[#F2FF00] font-bold px-6 py-3 rounded-xl shadow-[0_4px_0_#a82626] hover:shadow-[0_2px_0_#a82626] transition-all cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              </section>

              {/* FEATURE CARDS FOR VISITORS */}
              <section className="px-4 py-16">
                <div className="flex flex-col md:flex-row gap-6 max-w-[1100px] mx-auto mt-8">
                  {/* Card 1 - Owners */}
                  <article className="flex-1 bg-[#E23838] text-white p-8 rounded-2xl shadow-[0_12px_24px_rgba(226,56,56,0.3)] hover:shadow-[0_16px_32px_rgba(226,56,56,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-2xl font-bold mb-4">The Control Center</h3>
                    <p className="text-white/90 text-base leading-relaxed mb-6">
                      If you own a restaurant or cafe, this is for you. Easily manage your menu in real-time—change prices, add new dishes, or mark items as 'Sold Out' instantly.
                    </p>
                    <a
                      href="/signup-auth?role=owner"
                      className="inline-block bg-[#F2FF00] text-[#E23838] font-bold px-5 py-3 rounded-lg shadow-[0_4px_0_#d4dd00] hover:shadow-[0_2px_0_#d4dd00] hover:translate-y-[2px] transition-all text-center"
                    >
                      Register your shop
                    </a>
                  </article>

                  {/* Card 2 - Food lovers */}
                  <article className="flex-1 bg-[#E23838] text-white p-8 rounded-2xl shadow-[0_12px_24px_rgba(226,56,56,0.3)] hover:shadow-[0_16px_32px_rgba(226,56,56,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-2xl font-bold mb-4">The Control Center</h3>
                    <p className="text-white/90 text-base leading-relaxed mb-6">
                      For the food lovers! Sign up to "Heart" your favorite local spots. This saves their menu to your personal list and allows you to check updated prices and new specials.
                    </p>
                    <a
                      href="/signup-auth?role=user"
                      className="inline-block bg-[#F2FF00] text-[#E23838] font-bold px-5 py-3 rounded-lg shadow-[0_4px_0_#d4dd00] hover:shadow-[0_2px_0_#d4dd00] hover:translate-y-[2px] transition-all text-center"
                    >
                      Register food lover!
                    </a>
                  </article>

                  {/* Card 3 - Dynamic QR */}
                  <article className="flex-1 bg-[#E23838] text-white p-8 rounded-2xl shadow-[0_12px_24px_rgba(226,56,56,0.3)] hover:shadow-[0_16px_32px_rgba(226,56,56,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-2xl font-bold mb-4">Print Once, Update Forever</h3>
                    <p className="text-white/90 text-base leading-relaxed mb-6">
                      Our QR codes are "dynamic". Change your menu every single day, but you never have to reprint your table stickers.
                    </p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-block bg-[#F2FF00] text-[#E23838] font-bold px-5 py-3 rounded-lg shadow-[0_4px_0_#d4dd00] hover:shadow-[0_2px_0_#d4dd00] hover:translate-y-[2px] transition-all text-center"
                    >
                      Start Exploring!
                    </button>
                  </article>
                </div>
              </section>

              {/* PUBLIC EXTRA INFO */}
              <section className="text-center px-4 py-16">
                <p className="max-w-[620px] mx-auto mb-4 text-[1.3rem] text-[#333]">
                  MenuQR isn’t just a digital menu—it’s an intelligent engagement tool. We provide a seamless, contactless experience that allows users to "heart" their favorite local spots and view live menu updates anytime, anywhere.
                </p>
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-3 bg-[#E23838] text-[#F2FF00] font-bold px-8 py-4 rounded-xl shadow-[0_6px_0_#a82626] hover:shadow-[0_4px_0_#a82626] transition-all mt-6"
                >
                  <Image src="/logo.png" alt="MenuQR" width={32} height={32} />
                  <span>MenuQR</span>
                </a>
              </section>
            </> 
          ) }
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
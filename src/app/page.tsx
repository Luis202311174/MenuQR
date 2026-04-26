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

      <div className="flex flex-col min-h-screen bg-[#F4F3ED] text-[#333]">

        <main className="flex-1">
          {session ? (
            /* logged in preview */
            <>
              {/* HERO SECTION */}
              <section className="px-4 py-16">
                <div className="max-w-[1400px] mx-auto">
                  <div className="rounded-[32px] border border-slate-200 bg-white p-12 shadow-sm">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                      {/* LEFT CONTENT */}
                      <div>
                        <div className="mb-8">
                          <p className="text-sm uppercase tracking-[0.4em] font-bold text-[#E23838] mb-3">Welcome Back</p>
                          <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-4">
                            Hello, {userName || "Guest"}!
                          </h1>
                          <p className="text-sm uppercase tracking-[0.2em] font-semibold text-slate-500">
                            Your Personal Dashboard
                          </p>
                        </div>

                        <p className="text-lg text-slate-600 leading-relaxed mb-8">
                          MenuQR is an intelligent engagement tool providing a seamless, contactless dining experience. Our platform brings your favorite menus straight to your phone, making it easier than ever to explore, save, and enjoy local eateries.
                        </p>
                        
                        <a href="/user-home" className="inline-block rounded-full bg-[#E23838] text-[#F2FF00] font-bold px-10 py-4 text-lg transition hover:bg-[#c22f2f] shadow-sm hover:shadow-md">
                          Browse Menus →
                        </a>
                      </div>

                      {/* RIGHT VISUAL */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-8">
                          <Image src="/hero-icon.png" alt="MenuQR Logo" width={280} height={280} />
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900 leading-tight">
                            Your Favorite Menus,<br />
                            <span className="text-[#E23838]">Always in Your Pocket.</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* FEATURES SECTION */}
              <section className="px-4 py-12">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-8">
                    <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">Features</p>
                    <h2 className="text-2xl font-bold text-slate-900 mt-2">Why MenuQR is Great</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="rounded-[24px] bg-gradient-to-br from-[#E23838] to-[#c22f2f] text-white p-8 shadow-sm hover:shadow-md transition">
                      <h3 className="text-xl font-bold mb-3">Easy Access</h3>
                      <p className="text-white/90 mb-6 leading-relaxed">Find and access menus instantly via QR codes. No downloads needed.</p>
                      <a href="/user-home" className="inline-block rounded-2xl bg-[#F2FF00] text-[#E23838] font-bold px-5 py-2 text-sm hover:bg-opacity-90 transition">
                        Explore Now
                      </a>
                    </div>

                    <div className="rounded-[24px] bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 shadow-sm hover:shadow-md transition">
                      <h3 className="text-xl font-bold mb-3">Save Favorites</h3>
                      <p className="text-white/90 mb-6 leading-relaxed">Heart your favorite restaurants and access them anytime.</p>
                      <a href="/user-home" className="inline-block rounded-2xl bg-white text-blue-600 font-bold px-5 py-2 text-sm hover:bg-opacity-90 transition">
                        Go to Saved
                      </a>
                    </div>

                    <div className="rounded-[24px] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-8 shadow-sm hover:shadow-md transition">
                      <h3 className="text-xl font-bold mb-3">Live Updates</h3>
                      <p className="text-white/90 mb-6 leading-relaxed">See the latest menus with real-time price updates.</p>
                      <a href="/user-home" className="inline-block rounded-2xl bg-white text-emerald-600 font-bold px-5 py-2 text-sm hover:bg-opacity-90 transition">
                        Browse All
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA SECTION */}
              <section className="px-4 py-12">
                <div className="max-w-[1400px] mx-auto">
                  <div className="rounded-[32px] border border-slate-200 bg-white p-12 shadow-sm text-center">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Ready to Explore?</h2>
                    <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                      Start browsing menus, saving your favorite restaurants, and discovering new dining experiences.
                    </p>
                    <a href="/user-home" className="inline-block rounded-3xl bg-[#E23838] text-[#F2FF00] font-bold px-8 py-4 text-lg hover:bg-[#c22f2f] transition">
                      Go to Dashboard
                    </a>
                  </div>
                </div>
              </section>
            </>
          ) : (
            /* unlogged landing page */
            <>
              {/* HERO SECTION */}
              <section className="px-4 py-16">
                <div className="max-w-[1400px] mx-auto">
                  <div className="rounded-[32px] border border-slate-200 bg-white p-12 shadow-sm">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                      {/* LEFT VISUAL */}
                      <div className="order-2 lg:order-1 flex flex-col items-center justify-center">
                        <div className="mb-8">
                          <Image src="/hero-icon.png" alt="MenuQR Icon" width={300} height={240} priority />
                        </div>
                      </div>

                      {/* RIGHT CONTENT */}
                      <div className="order-1 lg:order-2">
                        <h2 className="text-5xl font-bold text-slate-900 leading-tight mb-4">
                          Your Favorite Menus,<br />
                          <span className="text-[#E23838]">Always in Your Pocket.</span>
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed mb-8">
                          The simplest way for customers to browse, save, and stay connected to the food they love.
                        </p>
                        <button
                          onClick={() => setShowModal(true)}
                          className="inline-block rounded-full bg-[#E23838] text-[#F2FF00] font-bold px-10 py-4 text-lg transition hover:bg-[#c22f2f] shadow-sm hover:shadow-md cursor-pointer"
                        >
                          Get Started →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* FEATURE CARDS FOR VISITORS */}
              <section className="px-4 py-16">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <p className="text-sm uppercase tracking-[0.4em] font-bold text-[#E23838] mb-3 text-center">Choose Your Role</p>
                    <h2 className="text-4xl font-bold text-slate-900 text-center mb-2">Two Paths, One Platform</h2>
                    <p className="text-lg text-slate-600 text-center max-w-2xl mx-auto">
                      Whether you're a restaurant owner or a food enthusiast, MenuQR has the perfect features for you.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1 - Owners */}
                    <article className="flex-1 bg-gradient-to-br from-[#E23838] to-[#c22f2f] text-white p-10 rounded-[28px] shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="mb-6">
                        <div className="text-5xl mb-4">🏪</div>
                        <h3 className="text-2xl font-bold mb-2">For Restaurants</h3>
                        <p className="text-sm text-white/70 uppercase tracking-[0.2em] font-semibold">The Control Center</p>
                      </div>
                      <p className="text-white/90 text-base leading-relaxed mb-8 flex-1">
                        Manage your menu in real-time. Change prices, add new dishes, mark items as sold out—instantly. Never reprint your QR codes again.
                      </p>
                      <a
                        href="/signup-auth?role=owner"
                        className="inline-block w-full bg-[#F2FF00] text-[#E23838] font-bold px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all text-center"
                      >
                        Register Your Restaurant
                      </a>
                    </article>

                    {/* Card 2 - Food lovers */}
                    <article className="flex-1 bg-gradient-to-br from-blue-500 to-blue-700 text-white p-10 rounded-[28px] shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="mb-6">
                        <div className="text-5xl mb-4">👤</div>
                        <h3 className="text-2xl font-bold mb-2">For Food Lovers</h3>
                        <p className="text-sm text-white/70 uppercase tracking-[0.2em] font-semibold">Your Personal Assistant</p>
                      </div>
                      <p className="text-white/90 text-base leading-relaxed mb-8 flex-1">
                        Heart your favorite spots and get notifications. See updated prices, new specials, and curated recommendations just for you.
                      </p>
                      <a
                        href="/signup-auth?role=user"
                        className="inline-block w-full bg-white text-blue-600 font-bold px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all text-center"
                      >
                        Sign Up as User
                      </a>
                    </article>

                    {/* Card 3 - Dynamic QR */}
                    <article className="flex-1 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-10 rounded-[28px] shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="mb-6">
                        <div className="text-5xl mb-4">✨</div>
                        <h3 className="text-2xl font-bold mb-2">Smart QR Codes</h3>
                        <p className="text-sm text-white/70 uppercase tracking-[0.2em] font-semibold">Print Once, Update Forever</p>
                      </div>
                      <p className="text-white/90 text-base leading-relaxed mb-8 flex-1">
                        Dynamic QR codes that never expire. Update your menu daily without reprinting a single thing. Truly infinite flexibility.
                      </p>
                      <button
                        onClick={() => setShowModal(true)}
                        className="inline-block w-full bg-white text-emerald-600 font-bold px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all text-center cursor-pointer"
                      >
                        Learn More
                      </button>
                    </article>
                  </div>
                </div>
              </section>

              {/* PUBLIC EXTRA INFO */}
              <section className="text-center px-4 py-16 bg-[#F4F3ED]">
                <div className="max-w-[1400px] mx-auto">
                  <p className="max-w-[620px] mx-auto mb-8 text-xl text-slate-700 leading-relaxed">
                    MenuQR is more than just a digital menu—it's an intelligent engagement tool providing seamless, contactless dining experiences.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-block rounded-full bg-[#E23838] text-[#F2FF00] font-bold px-10 py-4 text-lg hover:bg-[#c22f2f] transition shadow-sm hover:shadow-md"
                  >
                    Join MenuQR Today
                  </button>
                </div>
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
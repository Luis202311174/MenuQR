"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchStores } from "@/utils/fetchStores";

export default function UserHome() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<any[]>([]);
  const [savedBusinessIds, setSavedBusinessIds] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<"dashboard" | "suggestions" | "saved" | "menus">("dashboard");
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Food Lover");

  const saveBusinessToStorage = (ids: string[]) => {
    localStorage.setItem("user_saved_business_ids", JSON.stringify(ids));
  };

  const handleToggleSaveBusiness = (business: any) => {
    const isSaved = savedBusinessIds.includes(business.id);
    const updatedIds = isSaved
      ? savedBusinessIds.filter((id) => id !== business.id)
      : [...savedBusinessIds, business.id];

    setSavedBusinessIds(updatedIds);
    saveBusinessToStorage(updatedIds);

    if (isSaved) {
      setSaved((prev) => prev.filter((item) => item.id !== business.id));
    } else {
      setSaved((prev) => [...prev, business]);
    }
  };

  const runLoadData = async () => {
    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userName = authData?.user?.user_metadata?.full_name || authData?.user?.user_metadata?.name || authData?.user?.email;
      if (userName) {
        setDisplayName(userName);
      }

      const stores = await fetchStores();
      const businessItems = stores.map((biz) => ({
        id: biz.id,
        title: biz.name,
        source: biz.store_category || "Business",
        address: biz.address,
        contact: biz.contact_info || "No contact info",
        logoUrl: biz.logo_url || "/hero-icon.png",
        slug: biz.slug,
      }));

      setSuggestions(businessItems);
      setAllBusinesses(businessItems);

      const storage = localStorage.getItem("user_saved_business_ids");
      const parsedIds = storage ? JSON.parse(storage) : [];

      if (Array.isArray(parsedIds)) {
        setSavedBusinessIds(parsedIds);
        setSaved(businessItems.filter((biz) => parsedIds.includes(biz.id)));
      }
    } catch (error) {
      console.error("Failed to load user-home data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runLoadData();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-gray-600">Loading your dashboard...</div>;
  }

  const panelContent = () => {
    const suggestionCards = () =>
      suggestions.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((item) => (
            <div key={item.id} className="border border-gray-300 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white flex flex-col items-center text-center transform hover:scale-105">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border border-gray-300 flex-shrink-0 shadow-md">
                <img src={item.logoUrl} alt={`${item.title} logo`} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <p className="text-2xl font-black mb-1 text-gray-900">{item.title}</p>
              <p className="text-sm text-red-600 uppercase tracking-wider mb-4 font-bold">{item.source}</p>
              <p className="text-sm text-gray-700 mb-1 text-left w-full">{item.address}</p>
              <p className="text-sm text-gray-700 mb-6 text-left w-full">{item.contact}</p>
              <a href={`/${item.slug}`} className="w-full px-4 py-3 rounded-lg bg-[#E23838] text-white text-base font-bold hover:bg-[#c22f2f] transition-all shadow-md hover:shadow-lg">
                Visit
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No suggested businesses found yet.</p>
      );

    const savedCards = () =>
      saved.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {saved.map((item) => (
            <div key={item.id} className="border border-gray-300 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white flex flex-col items-center text-center transform hover:scale-105">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border border-gray-300 flex-shrink-0 shadow-md">
                <img src={item.logoUrl} alt={`${item.title} logo`} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <p className="text-2xl font-black mb-1 text-gray-900">{item.title}</p>
              <p className="text-sm text-red-600 uppercase tracking-wider mb-4 font-bold">{item.source}</p>
              <p className="text-sm text-gray-700 mb-1 text-left w-full">{item.address}</p>
              <p className="text-sm text-gray-700 mb-6 text-left w-full">{item.contact}</p>
              <div className="flex gap-3 w-full">
                <a href={`/${item.slug}`} className="flex-1 px-3 py-3 rounded-lg bg-[#E23838] text-white text-sm font-bold hover:bg-[#c22f2f] transition-all shadow-md hover:shadow-lg">
                  Visit
                </a>
                <button onClick={() => handleToggleSaveBusiness(item)} className="flex-1 px-3 py-3 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all shadow-md hover:shadow-lg">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No saved businesses yet. Save one from the Menus section.</p>
      );

    const menuCards = () =>
      allBusinesses.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allBusinesses.map((item) => {
            const isSaved = savedBusinessIds.includes(item.id);
            return (
              <div key={item.id} className="border border-gray-300 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white flex flex-col items-center text-center transform hover:scale-105">
                <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border border-gray-300 flex-shrink-0 shadow-md">
                  <img src={item.logoUrl} alt={`${item.title} logo`} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <p className="text-2xl font-black mb-1 text-gray-900">{item.title}</p>
                <p className="text-sm text-red-600 uppercase tracking-wider mb-4 font-bold">{item.source}</p>
                <p className="text-sm text-gray-700 mb-1 text-left w-full">{item.address}</p>
                <p className="text-sm text-gray-700 mb-6 text-left w-full">{item.contact}</p>
                <div className="flex gap-3 w-full">
                  <a href={`/${item.slug}`} className="flex-1 px-3 py-3 rounded-lg bg-[#E23838] text-white text-sm font-bold hover:bg-[#c22f2f] transition-all shadow-md hover:shadow-lg">
                    Visit
                  </a>
                  <button onClick={() => handleToggleSaveBusiness(item)} className={`flex-1 px-3 py-3 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg ${isSaved ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}>
                    {isSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600">No businesses available yet.</p>
      );

    if (activePanel === "dashboard") {
      return (
        <div className="space-y-0">
          <section className="pb-8">
            <h3 className="text-2xl font-bold mb-6">Suggestion</h3>
            {suggestionCards()}
          </section>
          <div className="border-t-2 border-gray-300 my-8"></div>
          <section className="pb-8">
            <h3 className="text-2xl font-bold mb-6">Saved Menus</h3>
            {savedCards()}
          </section>
          <div className="border-t-2 border-gray-300 my-8"></div>
          <section className="pb-8">
            <h3 className="text-2xl font-bold mb-6">Menus</h3>
            {menuCards()}
          </section>
        </div>
      );
    }

    if (activePanel === "suggestions") {
      return suggestionCards();
    }

    if (activePanel === "saved") {
      return savedCards();
    }

    if (activePanel === "menus") {
      return menuCards();
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#FCFBF4] px-4 py-6">
      <div className="max-w-[1400px] mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-r border-gray-200 p-6 bg-white space-y-4">
            <button
              onClick={() => setActivePanel("dashboard")}
              className={`w-full text-left rounded-lg py-3 px-4 text-base font-semibold ${activePanel === "dashboard" ? "bg-[#E23838] text-white" : "bg-gray-100 text-gray-800"}`}>
              Dashboard
            </button>
            <button
              onClick={() => setActivePanel("suggestions")}
              className={`w-full text-left rounded-lg py-3 px-4 text-base font-semibold ${activePanel === "suggestions" ? "bg-[#E23838] text-white" : "bg-gray-100 text-gray-800"}`}>
              Suggestions
            </button>
            <button
              onClick={() => setActivePanel("saved")}
              className={`w-full text-left rounded-lg py-3 px-4 text-base font-semibold ${activePanel === "saved" ? "bg-[#E23838] text-white" : "bg-gray-100 text-gray-800"}`}>
              Saved Menus
            </button>
            <button
              onClick={() => setActivePanel("menus")}
              className={`w-full text-left rounded-lg py-3 px-4 text-base font-semibold ${activePanel === "menus" ? "bg-[#E23838] text-white" : "bg-gray-100 text-gray-800"}`}>
              Menus
            </button>
          </aside>

          <main className="p-6">
            <header className="mb-8">
              <h1 className="text-4xl font-bold">Hello, Food Lover - {displayName}</h1>
              <p className="text-gray-600 mt-1 text-lg">Welcome and see more menus!</p>
            </header>

            <section>
              <h2 className="text-2xl font-bold mb-4 capitalize">{activePanel}</h2>
              {panelContent()}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

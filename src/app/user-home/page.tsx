"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchStores } from "@/utils/fetchStores";
import PageShell from "@/components/PageShell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faLightbulb,
  faBookmark,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

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

  const BusinessCard = ({ item, isSaved, onToggleSave, showRemove = false }: any) => (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
      <div className="w-32 h-32 rounded-[20px] overflow-hidden mb-4 border border-slate-200 mx-auto bg-slate-50">
        <img src={item.logoUrl} alt={`${item.title} logo`} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-900">{item.title}</p>
        <p className="text-xs text-slate-500 uppercase tracking-wider mt-1 mb-3 font-semibold">{item.source}</p>
        <p className="text-sm text-slate-600 mb-1 line-clamp-2">{item.address}</p>
        <p className="text-sm text-slate-600 mb-4 line-clamp-1">{item.contact}</p>
        <div className="flex gap-2">
          <a href={`/${item.slug}`} className="flex-1 px-3 py-2.5 rounded-[18px] bg-[#E23838] text-[#F2FF00] text-xs font-bold hover:bg-[#c22f2f] transition-all text-center">
            Visit Menu
          </a>
          <button 
            onClick={() => onToggleSave(item)} 
            className={`flex-1 px-3 py-2.5 rounded-[18px] text-xs font-bold transition-all ${
              isSaved 
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {showRemove ? (isSaved ? "Remove" : "Remove") : (isSaved ? "Saved" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );

  const suggestionCards = () =>
    suggestions.length ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {suggestions.map((item) => (
          <BusinessCard 
            key={item.id} 
            item={item} 
            isSaved={savedBusinessIds.includes(item.id)}
            onToggleSave={handleToggleSaveBusiness}
          />
        ))}
      </div>
    ) : (
      <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200">
        <p className="text-slate-500">No suggested businesses found yet.</p>
      </div>
    );

  const savedCards = () =>
    saved.length ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {saved.map((item) => (
          <BusinessCard 
            key={item.id} 
            item={item} 
            isSaved={true}
            onToggleSave={handleToggleSaveBusiness}
            showRemove={true}
          />
        ))}
      </div>
    ) : (
      <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200">
        <p className="text-slate-500">No saved businesses yet. Save one from the Menus section.</p>
      </div>
    );

  const menuCards = () =>
    allBusinesses.length ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allBusinesses.map((item) => (
          <BusinessCard 
            key={item.id} 
            item={item} 
            isSaved={savedBusinessIds.includes(item.id)}
            onToggleSave={handleToggleSaveBusiness}
          />
        ))}
      </div>
    ) : (
      <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200">
        <p className="text-slate-500">No businesses available yet.</p>
      </div>
    );

  const panelContent = () => {
    if (activePanel === "dashboard") {
      return (
        <div className="space-y-8">
          <section>
            <div className="mb-6 pb-3 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Suggestions</h3>
              <p className="text-sm text-slate-500 mt-1">Handpicked recommendations for you</p>
            </div>
            {suggestionCards()}
          </section>

          <section>
            <div className="mb-6 pb-3 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Saved Menus</h3>
              <p className="text-sm text-slate-500 mt-1">Your favorite restaurants</p>
            </div>
            {savedCards()}
          </section>

          <section>
            <div className="mb-6 pb-3 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">All Menus</h3>
              <p className="text-sm text-slate-500 mt-1">Browse all available restaurants</p>
            </div>
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
    <div className="min-h-screen bg-slate-50">
      <div className="grid lg:grid-cols-[260px_1fr] h-full">
        {/* Sidebar */}
        <div className="hidden lg:block border-r border-slate-200 bg-white shadow-sm">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-full lg:sticky lg:top-[90px] lg:self-start">
            <div className="mb-4">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                <FontAwesomeIcon icon={faGaugeHigh} className="text-sm" />
                <span>User Dashboard</span>
              </div>
            </div>

            <nav className="space-y-2">
              {[
                { panel: "dashboard", label: "Dashboard", icon: faGaugeHigh },
                { panel: "suggestions", label: "Suggestions", icon: faLightbulb },
                { panel: "saved", label: "Saved", icon: faBookmark },
                { panel: "menus", label: "All Menus", icon: faUtensils },
              ].map(({ panel, label, icon }) => (
                <button
                  key={panel}
                  onClick={() => setActivePanel(panel as any)}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-xs font-semibold transition ${
                    activePanel === panel
                      ? "bg-gradient-to-r from-[#4f65ff] to-[#8e7ffd] text-white shadow-md shadow-[#4f65ff]/15"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    activePanel === panel ? "bg-white/15 text-white" : "bg-white text-slate-600 group-hover:bg-slate-200"
                  }`}>
                    <FontAwesomeIcon icon={icon} className="text-xs" />
                  </span>
                  <span className="capitalize">{label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>

        {/* Main Content */}
        <div className="overflow-y-auto">
          <PageShell title="Welcome" subtitle={`Hello, ${displayName}!`}>
            <div className="space-y-8">
          {/* Content Section */}
          {activePanel !== "dashboard" && (
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 capitalize">
                  {activePanel === "suggestions" && "Suggestions"}
                  {activePanel === "saved" && "Saved Menus"}
                  {activePanel === "menus" && "All Menus"}
                </h2>
                <p className="text-slate-600 mt-2 text-sm">
                  {activePanel === "suggestions" && "Handpicked recommendations for you"}
                  {activePanel === "saved" && "Your favorite restaurants"}
                  {activePanel === "menus" && "Browse all available restaurants"}
                </p>
              </div>
              {panelContent()}
            </div>
          )}

            {/* Dashboard View - Without Content Card Wrapper */}
            {activePanel === "dashboard" && (
              <div className="space-y-8">
                {panelContent()}
              </div>
            )}
            </div>
          </PageShell>
        </div>
      </div>
    </div>
  );
}

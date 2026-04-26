"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessOrdersNotifier from "@/components/business/BusinessOrdersNotifier";
import jsPDF from "jspdf";

interface ITable {
  id: string;
  business_id?: string;
  table_number: string;
  qr_code: string;
  status: string;
  current_session_id: string | null;
  created_at?: string;
}

export default function TableQRPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [ordersCount, setOrdersCount] = useState(0);

  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleDownloadPDF = async (table: ITable) => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a6", orientation: "portrait" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Outer rounded border
      doc.setLineWidth(1.8);
      doc.setDrawColor(20, 20, 20);
      doc.roundedRect(4, 4, pageWidth - 8, pageHeight - 8, 6, 6, "S");

      // Business name
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(businessName, pageWidth / 2, 18, { align: "center" });

      // Table number
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Table ${table.table_number}`, pageWidth / 2, 27, { align: "center" });

      // QR code block
      const qrSize = 68;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 36;

      doc.setLineWidth(2.5);
      doc.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, "S");

      if (table.qr_code) {
        const qrResponse = await fetch(table.qr_code);
        const qrBlob = await qrResponse.blob();
        const qrDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(qrBlob);
        });

        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      }

      // Footer text
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Scan to Order!", pageWidth / 2, pageHeight - 18, { align: "center" });

      // Save as quarter-sized card PDF
      doc.save(`table-${table.table_number}-card.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF");
    }
  };

  const getBaseUrl = () => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_SITE_URL || "";
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;
      setAuthChecked(true);

      if (!sess?.user) return router.push("/");

      setSession(sess);

      try {
        // Owner
        const { data: ownerBiz, error: ownerError } = await supabase
          .from("businesses")
          .select("id, slug, name")
          .eq("owner_id", sess.user.id)
          .single();

        if (ownerError && ownerError.code !== "PGRST116") throw ownerError;

        if (ownerBiz) {
          setBusinessId(ownerBiz.id);
          setBusinessSlug(ownerBiz.slug);
          setBusinessName(ownerBiz.name);
          return;
        }

        // Staff
        const { data: staffBiz, error: staffError } = await supabase
          .from("business_staff")
          .select("business_id")
          .eq("user_id", sess.user.id)
          .single();

        if (staffError && staffError.code !== "PGRST116") throw staffError;

        if (staffBiz) {
          setBusinessId(staffBiz.business_id);

          // fetch slug and name separately
          const { data: biz } = await supabase
            .from("businesses")
            .select("slug, name")
            .eq("id", staffBiz.business_id)
            .single();

          if (biz) {
            setBusinessSlug(biz.slug);
            setBusinessName(biz.name);
          }
        } else {
          router.push("/");
        }
      } catch (err: any) {
        console.error(err);
        router.push("/");
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!businessId) return;
    setOrdersCount(0);
  }, [businessId]);

  // =========================
  // FETCH TABLES
  // =========================
  const fetchTables = async () => {
    if (!businessId) return;

    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setTables(data || []);
  };

  useEffect(() => {
    if (businessId) fetchTables();
  }, [businessId]);

  // ADD TABLE (FIXED QR FLOW)
  const handleAddTables = async (count: number) => {
    if (!businessId || !businessSlug) return;
    setLoading(true);

    try {
      // 1. Get existing tables
      const { data: existingTables, error: fetchError } = await supabase
        .from("tables")
        .select("table_number")
        .eq("business_id", businessId);

      if (fetchError) throw fetchError;

      // 2. Get current max
      const numbers = (existingTables || [])
        .map((t) => parseInt(t.table_number))
        .filter((n) => !isNaN(n));

      let currentMax = numbers.length > 0 ? Math.max(...numbers) : 0;

      const newTables: ITable[] = [];

      // 3. Loop create tables
      for (let i = 0; i < count; i++) {
        const nextNumber = currentMax + 1;
        currentMax++;

        const formattedNumber = String(nextNumber).padStart(3, "0");

        // Insert table
        const { data, error } = await supabase
          .from("tables")
          .insert([
            {
              business_id: businessId,
              table_number: formattedNumber,
              status: "available",
            },
          ])
          .select()
          .single();

        if (error) throw error;

        const tableId = data.id;

        // Generate QR
        const qrData = `${getBaseUrl()}/${businessSlug}?table=${tableId}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
          qrData
        )}`;

        // Save QR
        const { error: updateError } = await supabase
          .from("tables")
          .update({ qr_code: qrCodeUrl })
          .eq("id", tableId);

        if (updateError) throw updateError;

        newTables.push({ ...data, qr_code: qrCodeUrl });
      }

      // 4. Update UI (prepend all new tables)
      setTables((prev) => [...newTables.reverse(), ...prev]);
    } catch (err: any) {
      console.error(err);
      alert("Failed to add tables: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // DELETE TABLE
  const handleDeleteTable = async (id: string) => {
    if (!confirm("Delete this table?")) return;

    const { error } = await supabase.from("tables").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearAllSessions = async () => {
    if (!businessId) return;
    if (
      !confirm(
        "Are you sure you want to clear all active table sessions? This will end all current sessions and make tables available."
      )
    )
      return;

    try {
      const { data: businessTables, error: tableFetchError } = await supabase
        .from("tables")
        .select("id")
        .eq("business_id", businessId);

      if (tableFetchError) throw tableFetchError;

      const tableIds = (businessTables || [])
        .map((t: any) => t.id)
        .filter(
          (id: any): id is string =>
            typeof id === "string" && id.length > 0 && id !== "null"
        );

      if (tableIds.length > 0) {
        const { error: sessionError } = await supabase
          .from("table_sessions")
          .update({
            active: false,
            ended_at: new Date().toISOString(),
          })
          .in("table_id", tableIds)
          .eq("active", true);

        if (sessionError) throw sessionError;
      }

      const { error: tableError } = await supabase
        .from("tables")
        .update({
          current_session_id: null,
          status: "available",
        })
        .eq("business_id", businessId)
        .not("current_session_id", "is", null);

      if (tableError) throw tableError;

      await fetchTables();
      alert("All sessions cleared successfully!");
    } catch (err: any) {
      console.error("FULL ERROR:", JSON.stringify(err, null, 2));
      alert(
        "Failed to clear sessions: " +
          (err?.message || JSON.stringify(err))
      );
    }
  };

  // UI
  if (!authChecked || !session) return <div className="p-10">Loading...</div>;

  return (
    <>
      <BusinessOrdersNotifier businessId={businessId} onCountChange={setOrdersCount} />
      <div className="min-h-screen bg-[#F4F3ED]">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-3xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm border border-slate-200"
          >
            Show menu
          </button>
          <p className="text-xs font-semibold text-slate-600">{tables.length} tables</p>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <div className="hidden lg:block">
            <BusinessSidebar ordersCount={ordersCount} />
          </div>

          {sidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 w-[90vw] max-w-xs overflow-y-auto bg-white shadow-xl border-r border-slate-200 p-6 lg:hidden">
                <BusinessSidebar onClose={() => setSidebarOpen(false)} ordersCount={ordersCount} />
              </div>
            </>
          )}

          <main className="space-y-8">
            <div className="rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
              <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                    Table Management
                  </p>
                  <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mt-1">Table QR Codes</h1>
                </div>
                <div className="rounded-3xl bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700">
                  {tables.length} tables
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-base sm:text-xl font-semibold text-slate-900">Your Tables</h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Create and manage QR codes for each table
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
                  <div className="relative flex">
                    <button
                      onClick={() => handleAddTables(1)}
                      disabled={loading}
                      className="rounded-l-3xl bg-[#E23838] text-[#F2FF00] font-bold px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm hover:bg-[#c22f2f] disabled:opacity-60 whitespace-nowrap"
                    >
                      {loading ? "Creating..." : "+ Add"}
                    </button>
                    <button
                      onClick={() => setShowDropdown((prev) => !prev)}
                      className="rounded-r-3xl bg-[#c22f2f] text-[#F2FF00] px-2 sm:px-3"
                    >
                      ▼
                    </button>
                  </div>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-32 sm:w-40 bg-white border border-slate-200 rounded-2xl shadow-lg z-50">
                      <button
                        onClick={() => {
                          handleAddTables(5);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-slate-100"
                      >
                        Add 5 Tables
                      </button>
                      <button
                        onClick={() => {
                          handleAddTables(10);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-slate-100"
                      >
                        Add 10 Tables
                      </button>
                      <button
                        onClick={() => {
                          handleAddTables(20);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-slate-100"
                      >
                        Add 20 Tables
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleClearAllSessions}
                    className="rounded-3xl bg-red-600 text-white font-bold px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm hover:bg-red-700 whitespace-nowrap"
                  >
                    Clear Sessions
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {tables.length > 0 ? (
                  tables.map((table) => (
                    <div key={table.id} className="rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
                      <div className="bg-gradient-to-r from-[#E23838] to-[#c22f2f] px-3 sm:px-6 py-2 sm:py-4">
                        <h3 className="text-sm sm:text-lg font-bold text-white text-center">
                          Table {table.table_number}
                        </h3>
                      </div>
                      <div className="p-3 sm:p-6 flex flex-col items-center space-y-2 sm:space-y-4">
                        {table.qr_code && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-4">
                            <img
                              src={table.qr_code}
                              alt={`QR for Table ${table.table_number}`}
                              className="h-24 sm:h-32 w-24 sm:w-32 object-contain"
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-2 w-full">
                          <button
                            onClick={() => handleDownloadPDF(table)}
                            className="w-full rounded-[20px] bg-blue-600 text-white font-semibold px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm transition hover:bg-blue-700"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteTable(table.id)}
                            className="w-full rounded-[20px] border border-slate-200 bg-white text-slate-700 font-semibold px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm transition hover:bg-slate-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 sm:py-12 bg-slate-50 rounded-3xl border border-slate-200">
                    <p className="text-sm sm:text-base text-slate-500">No tables created yet</p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2">Add your first table to get started</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
    </>
  );
}

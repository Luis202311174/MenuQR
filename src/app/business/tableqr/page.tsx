"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import BusinessSidebar from "@/components/business/BusinessSidebar";
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

  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [tableNumber, setTableNumber] = useState("");

  const handleDownloadQR = async (qrUrl: string, tableNumber: string) => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `table-${tableNumber}-qr.png`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download QR");
    }
  };

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

  // =========================
  // ADD TABLE (FIXED QR FLOW)
  // =========================
  const handleAddTable = async () => {
    if (!tableNumber.trim() || !businessId || !businessSlug) return;
    setLoading(true);

    try {
      // 1. Insert table FIRST
      const { data, error } = await supabase
        .from("tables")
        .insert([
          {
            business_id: businessId,
            table_number: tableNumber,
            status: "available",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const tableId = data.id;

      // 2. Generate QR with REAL URL
      const qrData = `${getBaseUrl()}/${businessSlug}?table=${tableId}`;

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        qrData
      )}`;

      // 3. Save QR into DB
      const { error: updateError } = await supabase
        .from("tables")
        .update({ qr_code: qrCodeUrl })
        .eq("id", tableId);

      if (updateError) throw updateError;

      // 4. Update UI
      setTables((prev) => [...prev, { ...data, qr_code: qrCodeUrl }]);
      setShowAddModal(false);
      setTableNumber("");
    } catch (err: any) {
      console.error(err);
      alert("Failed to add table: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DELETE TABLE
  // =========================
  const handleDeleteTable = async (id: string) => {
    if (!confirm("Delete this table?")) return;

    const { error } = await supabase.from("tables").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  // =========================
  // UI
  // =========================
  if (!authChecked || !session) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr] gap-8 px-4 py-8">
        <BusinessSidebar />

        <main className="space-y-8">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] font-semibold text-slate-500">
                  Table Management
                </p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">Table QR Codes</h1>
              </div>
              <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {tables.length} tables
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Your Tables</h2>
                <p className="text-sm text-slate-500">
                  Create and manage QR codes for each table
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-3xl bg-[#E23838] text-[#F2FF00] font-bold px-6 py-3 text-sm transition hover:bg-[#c22f2f]"
              >
                + Add Table
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tables.length > 0 ? (
                tables.map((table) => (
                  <div key={table.id} className="rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
                    <div className="bg-gradient-to-r from-[#E23838] to-[#c22f2f] px-6 py-4">
                      <h3 className="text-lg font-bold text-white text-center">
                        Table {table.table_number}
                      </h3>
                    </div>

                    <div className="p-6 flex flex-col items-center space-y-4">
                      {table.qr_code && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <img
                            src={table.qr_code}
                            alt={`QR for Table ${table.table_number}`}
                            className="h-32 w-32 object-contain"
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-3 w-full">
                        <button
                          onClick={() => handleDownloadPDF(table)}
                          className="w-full rounded-[20px] bg-blue-600 text-white font-semibold px-4 py-3 text-sm transition hover:bg-blue-700"
                        >
                          Download PDF
                        </button>

                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="w-full rounded-[20px] border border-slate-200 bg-white text-slate-700 font-semibold px-4 py-3 text-sm transition hover:bg-slate-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border border-slate-200">
                  <p className="text-slate-500">No tables created yet</p>
                  <p className="text-sm text-slate-400 mt-2">Add your first table to get started</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-[#E23838] px-6 py-4">
                <h2 className="text-xl font-bold text-white">Add New Table</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Table Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 01, A1, VIP-1"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#E23838] focus:bg-white"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleAddTable}
                    disabled={loading || !tableNumber.trim()}
                    className="flex-1 rounded-2xl bg-[#E23838] px-5 py-3 text-sm font-semibold text-[#F2FF00] transition hover:bg-[#c22f2f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Creating..." : "Create Table"}
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
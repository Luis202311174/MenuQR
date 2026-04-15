"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import BusinessSidebar from "@/components/BusinessSidebar";

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
          .select("id, slug")
          .eq("owner_id", sess.user.id)
          .single();

        if (ownerError && ownerError.code !== "PGRST116") throw ownerError;

        if (ownerBiz) {
          setBusinessId(ownerBiz.id);
          setBusinessSlug(ownerBiz.slug);
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

          // fetch slug separately
          const { data: biz } = await supabase
            .from("businesses")
            .select("slug")
            .eq("id", staffBiz.business_id)
            .single();

          if (biz) setBusinessSlug(biz.slug);
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
    <div className="min-h-screen bg-[#FCFBF4]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[260px_1fr]">
        <BusinessSidebar />

        <main className="p-8 bg-white">
          <h1 className="text-3xl font-bold mb-6">Table QR Management</h1>

          <button
            onClick={() => setShowAddModal(true)}
            className="mb-6 bg-[#E23838] text-[#F2FF00] px-5 py-2 rounded"
          >
            + Add Table
          </button>

          <div className="grid grid-cols-3 gap-4">
            {tables.map((table) => (
              <div key={table.id} className="border rounded-lg p-4 flex flex-col items-center">
                <div className="mb-2 font-bold text-lg">
                  Table {table.table_number}
                </div>

                {table.qr_code && (
                  <img
                    src={table.qr_code}
                    className="h-32 w-32 object-contain mb-2"
                  />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadQR(table.qr_code, table.table_number)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Download
                  </button>

                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {tables.length === 0 && (
              <div className="col-span-3 text-center text-gray-500">
                No tables yet
              </div>
            )}
          </div>
        </main>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded w-[400px]">
              <h2 className="text-xl font-bold mb-4">Add Table</h2>

              <input
                placeholder="Table number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="border p-2 w-full mb-4"
              />

              <button
                onClick={handleAddTable}
                className="bg-green-600 text-white px-4 py-2 rounded w-full"
              >
                {loading ? "Adding..." : "Save"}
              </button>

              <button
                onClick={() => setShowAddModal(false)}
                className="mt-2 text-gray-500 underline w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
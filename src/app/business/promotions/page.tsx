"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PageShell from "@/components/PageShell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTags,
  faPlus,
  faEye,
  faTrash,
  faCopy,
  faCheck,
  faTimes,
  faCalendarAlt,
  faPercent,
  faDollarSign,
} from "@fortawesome/free-solid-svg-icons";

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  description: string;
  is_active: boolean;
  usage_limit: number;
  usage_count: number;
  expires_at: string | null;
  created_at: string;
}

export default function BusinessPromotionsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessSchema, setBusinessSchema] = useState<'milestone' | 'reward' | 'none'>('reward');
  const [businessRewardSettings, setBusinessRewardSettings] = useState({
    enabled: false,
    minSpend: '0',
    rewardType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '0',
    claimLimit: '1',
    expirationDate: '',
    redemptionMinimum: '',
    customCode: '',
    description: 'Reward coupon for your next order',
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'} | null>(null);
  const [showRewardSettingsModal, setShowRewardSettingsModal] = useState(false);
  const [savingRewardSettings, setSavingRewardSettings] = useState(false);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // Form states for creating coupons
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    description: '',
    usage_limit: '1',
    expires_at: '',
  });
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [numberOfCodes, setNumberOfCodes] = useState('1');

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      setAuthChecked(true);

      if (!sess?.user) {
        router.push("/");
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", sess.user.id)
        .single();

      if (user?.role !== "owner") {
        router.push("/");
        return;
      }

      setSession(sess);

      // Get business
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", sess.user.id)
        .single();

      if (!biz) return;

      setBusinessId(biz.id);
      setBusinessName(biz.name || "");
      const hasMilestoneFields = (
        biz.milestone_promo_enabled !== undefined ||
        biz.milestone_coupon_discount_type !== undefined ||
        biz.milestone_coupon_discount_value !== undefined ||
        biz.milestone_coupon_usage_limit !== undefined ||
        biz.milestone_coupon_expires_at !== undefined ||
        biz.milestone_coupon_description !== undefined ||
        biz.milestone_coupon_redemption_minimum !== undefined ||
        biz.milestone_custom_code !== undefined
      );
      const hasRewardFields = (
        biz.reward_promo_enabled !== undefined ||
        biz.reward_coupon_discount_type !== undefined ||
        biz.reward_coupon_discount_value !== undefined ||
        biz.reward_coupon_usage_limit !== undefined ||
        biz.reward_coupon_expires_at !== undefined ||
        biz.reward_coupon_description !== undefined ||
        biz.reward_coupon_redemption_minimum !== undefined ||
        biz.reward_custom_code !== undefined
      );
      const schemaType = hasMilestoneFields ? 'milestone' : hasRewardFields ? 'reward' : 'none';
      setBusinessSchema(schemaType);
      setBusinessRewardSettings({
        enabled: !!(biz.milestone_promo_enabled ?? biz.reward_promo_enabled),
        minSpend: biz.target_min_spend != null ? String(biz.target_min_spend) : '0',
        rewardType: biz.milestone_coupon_discount_type ?? biz.reward_coupon_discount_type ?? 'percentage',
        discountValue: (biz.milestone_coupon_discount_value ?? biz.reward_coupon_discount_value) != null ? String(biz.milestone_coupon_discount_value ?? biz.reward_coupon_discount_value) : '0',
        claimLimit: (biz.milestone_coupon_usage_limit ?? biz.reward_coupon_usage_limit) != null ? String(biz.milestone_coupon_usage_limit ?? biz.reward_coupon_usage_limit) : '1',
        expirationDate: (biz.milestone_coupon_expires_at ?? biz.reward_coupon_expires_at) ? (biz.milestone_coupon_expires_at ?? biz.reward_coupon_expires_at).split('T')[0] : '',
        redemptionMinimum: (biz.milestone_coupon_redemption_minimum ?? biz.reward_coupon_redemption_minimum) != null ? String(biz.milestone_coupon_redemption_minimum ?? biz.reward_coupon_redemption_minimum) : '',
        customCode: biz.milestone_custom_code ?? biz.reward_custom_code ?? '',
        description: biz.milestone_coupon_description ?? biz.reward_coupon_description ?? 'Reward coupon for your next order',
      });

      // Load coupons
      await loadCoupons(biz.id);
    };

    init();
  }, [router]);

  const loadCoupons = async (bizId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });

      if (error) {
        const message = error.message || JSON.stringify(error, null, 2);
        setLoadError(message);
        console.error("Error loading coupons:", message, error);
        return;
      }

      const couponsList = data || [];
      setCoupons(couponsList);
    } catch (error: any) {
      const message = error?.message || JSON.stringify(error, null, 2);
      setLoadError(message);
      console.error("Error loading coupons:", message, error);
    } finally {
      setLoading(false);
    }
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCoupon = async () => {
    if (!businessId) return;

    const numCodes = parseInt(numberOfCodes);
    if (numCodes < 1 || numCodes > 50) {
      alert("Please enter a number between 1 and 50");
      return;
    }

    setGeneratingCodes(true);
    try {
      const couponsToCreate = [];

      for (let i = 0; i < numCodes; i++) {
        const code = numCodes === 1 && formData.code.trim()
          ? formData.code.trim().toUpperCase()
          : generateCouponCode();

        couponsToCreate.push({
          business_id: businessId,
          code,
          discount_type: formData.discount_type,
          discount_value: parseFloat(formData.discount_value),
          description: formData.description.trim() || null,
          usage_limit: parseInt(formData.usage_limit),
          expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        });
      }

      const { error } = await supabase
        .from("coupons")
        .insert(couponsToCreate);

      if (error) throw error;

      await loadCoupons(businessId);
      setShowCreateModal(false);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        description: '',
        usage_limit: '1',
        expires_at: '',
      });
      setNumberOfCodes('1');
    } catch (error: any) {
      console.error("Error creating coupons:", error);
      alert("Error creating coupons: " + error.message);
    } finally {
      setGeneratingCodes(false);
    }
  };

  

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm("Are you sure you want to delete this coupon? This action cannot be undone.")) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("coupons")
        .delete()
        .select("*")
        .eq("id", couponId)
        .eq("business_id", businessId!);

      if (error) {
        const message = error.message || error.details || error.hint || JSON.stringify(error);
        console.error("Error deleting coupon:", error);
        throw new Error(message || "Unknown error deleting coupon");
      }

      if (!data || data.length === 0) {
        throw new Error("Unable to delete coupon. It may no longer exist or you may not have permission.");
      }

      await loadCoupons(businessId!);
    } catch (error: any) {
      const message = error?.message || String(error) || "Unknown error";
      console.error("Error deleting coupon:", message, error);
      alert("Error deleting coupon: " + message);
    }
  };

  const handleToggleActive = async (couponId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !isActive })
        .eq("id", couponId);

      if (error) throw error;

      await loadCoupons(businessId!);
    } catch (error: any) {
      console.error("Error updating coupon:", error);
      alert("Error updating coupon: " + error.message);
    }
  };

  const saveRewardSettings = async () => {
    if (!businessId) return;
    setSavingRewardSettings(true);

    const buildPayload = (schema: 'milestone' | 'reward') => {
      const payload: any = {
        target_min_spend: parseFloat(businessRewardSettings.minSpend) || 0,
      };

      if (schema === 'milestone') {
        payload.milestone_promo_enabled = businessRewardSettings.enabled;
        payload.milestone_coupon_discount_type = businessRewardSettings.rewardType;
        payload.milestone_coupon_discount_value = parseFloat(businessRewardSettings.discountValue) || 0;
        payload.milestone_coupon_usage_limit = parseInt(businessRewardSettings.claimLimit) || 1;
        payload.milestone_coupon_expires_at = businessRewardSettings.expirationDate ? new Date(businessRewardSettings.expirationDate).toISOString() : null;
        payload.milestone_coupon_description = businessRewardSettings.description;
        payload.milestone_custom_code = businessRewardSettings.customCode.trim() || null;
        payload.milestone_coupon_redemption_minimum = businessRewardSettings.redemptionMinimum ? parseFloat(businessRewardSettings.redemptionMinimum) || null : null;
      } else {
        payload.reward_promo_enabled = businessRewardSettings.enabled;
        payload.reward_coupon_discount_type = businessRewardSettings.rewardType;
        payload.reward_coupon_discount_value = parseFloat(businessRewardSettings.discountValue) || 0;
        payload.reward_coupon_usage_limit = parseInt(businessRewardSettings.claimLimit) || 1;
        payload.reward_coupon_expires_at = businessRewardSettings.expirationDate ? new Date(businessRewardSettings.expirationDate).toISOString() : null;
        payload.reward_coupon_description = businessRewardSettings.description;
        payload.reward_custom_code = businessRewardSettings.customCode.trim() || null;
        payload.reward_coupon_redemption_minimum = businessRewardSettings.redemptionMinimum ? parseFloat(businessRewardSettings.redemptionMinimum) || null : null;
      }

      return payload;
    };

    const trySave = async (schema: 'milestone' | 'reward') => {
      const payload = buildPayload(schema);
      const { error } = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", businessId);
      return error;
    };

    try {
      if (businessSchema === 'none') {
        throw new Error('This database does not contain reward settings columns on the businesses table. Add reward/milestone fields or run the migration before saving.');
      }

      let error = await trySave(businessSchema);
      if (error && /column .* does not exist/i.test(error.message || "")) {
        const fallbackSchema = businessSchema === 'milestone' ? 'reward' : 'milestone';
        error = await trySave(fallbackSchema);
        if (!error) {
          setBusinessSchema(fallbackSchema);
        }
      }

      if (error) throw error;

      setShowRewardSettingsModal(false);
      await loadCoupons(businessId);
      setNotification({ message: "Reward settings saved successfully.", type: "success" });
    } catch (error: any) {
      console.error("Error saving reward settings:", error);
      alert("Error saving reward settings: " + (error.message || String(error)));
    } finally {
      setSavingRewardSettings(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };


  if (!authChecked) {
    return (
      <PageShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="space-y-4">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                  <FontAwesomeIcon icon={faTags} className="text-purple-600 text-base sm:text-lg" />
                  Promotions & Coupons
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1">
                  Create and manage discount coupons for your customers
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-2xl bg-purple-600 px-3 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm font-semibold text-white transition hover:bg-purple-700 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faPlus} className="text-sm sm:text-base" />
                Create Coupons
              </button>
            </div>
          </div>

          {notification && (
            <div className={`rounded-2xl border p-4 text-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-900'}`}>
              {notification.message}
            </div>
          )}

          {loadError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Could not load coupons.</p>
              <p className="mt-1">{loadError}</p>
              <p className="mt-2 text-xs text-red-700">
                If you haven't applied the coupon migration yet, run <code className="rounded bg-slate-100 px-1 py-0.5">add_coupon_system.sql</code> against your Supabase database.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Reward Coupon System</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Configure automatic reward coupons for customers who meet the minimum spend requirement.
                </p>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <p>Enabled: {businessRewardSettings.enabled ? 'Yes' : 'No'}</p>
                  <p>Minimum spend: {formatCurrency(parseFloat(businessRewardSettings.minSpend) || 0)}</p>
                  <p>Reward: {businessRewardSettings.rewardType === 'percentage' ? `${businessRewardSettings.discountValue}% OFF` : `${formatCurrency(parseFloat(businessRewardSettings.discountValue) || 0)} OFF`}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRewardSettingsModal(true)}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Manage Reward Settings
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
              <p className="text-xs sm:text-sm text-slate-500">Total Coupons</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{coupons.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
              <p className="text-xs sm:text-sm text-slate-500">Active Coupons</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {coupons.filter(c => c.is_active).length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
              <p className="text-xs sm:text-sm text-slate-500">Total Uses</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {coupons.reduce((sum, c) => sum + c.usage_count, 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
              <p className="text-xs sm:text-sm text-slate-500">Avg Discount</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">
                {coupons.length > 0
                  ? formatCurrency(coupons.reduce((sum, c) => sum + c.discount_value, 0) / coupons.length)
                  : formatCurrency(0)
                }
              </p>
            </div>
          </div>

          {/* Coupons Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="font-semibold text-slate-900">Your Coupons</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-slate-600">Loading coupons...</span>
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faTags} className="text-slate-300 text-4xl mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No coupons yet</h3>
                <p className="text-slate-500 mb-4">Create your first coupon to start offering discounts</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                >
                  Create Your First Coupon
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-100 px-2 py-1 rounded text-xs sm:text-sm font-mono">
                              {coupon.code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(coupon.code)}
                              className="text-slate-400 hover:text-slate-600"
                              title="Copy code"
                            >
                              <FontAwesomeIcon icon={faCopy} className="text-xs" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs sm:text-sm">
                            {coupon.discount_type === 'percentage' ? (
                              <FontAwesomeIcon icon={faPercent} className="text-green-600 text-xs" />
                            ) : (
                              <FontAwesomeIcon icon={faDollarSign} className="text-blue-600 text-xs" />
                            )}
                            <span className="text-xs sm:text-sm font-medium">
                              {coupon.discount_type === 'percentage'
                                ? `${coupon.discount_value}%`
                                : formatCurrency(coupon.discount_value)
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900">
                          {coupon.usage_count}/{coupon.usage_limit}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            coupon.is_active && coupon.usage_count < coupon.usage_limit
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {coupon.is_active && coupon.usage_count < coupon.usage_limit ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900">
                          {coupon.expires_at
                            ? new Date(coupon.expires_at).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedCoupon(coupon);
                                setShowViewModal(true);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-2"
                              title="View details"
                            >
                              <FontAwesomeIcon icon={faEye} className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                              className={`${coupon.is_active ? "text-red-400 hover:text-red-600" : "text-green-400 hover:text-green-600"} p-2`}
                              title={coupon.is_active ? "Deactivate" : "Activate"}
                            >
                              <FontAwesomeIcon icon={coupon.is_active ? faTimes : faCheck} className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="text-red-400 hover:text-red-600 p-2"
                              title="Delete coupon"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

      {/* Reward Settings Modal */}
      {showRewardSettingsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-3 py-6 sm:px-4 sm:py-8">
          <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/10">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Reward Settings</h3>
                  <p className="text-sm text-slate-500">Configure the automated reward coupon rules for this business.</p>
                </div>
                <button
                  onClick={() => setShowRewardSettingsModal(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
              <div className="space-y-4">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={businessRewardSettings.enabled}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Enable Reward System</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Spend Requirement</label>
                  <input
                    type="number"
                    min="0"
                    value={businessRewardSettings.minSpend}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, minSpend: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    placeholder="500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Example: ₱500 minimum order</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Reward Type</label>
                  <select
                    value={businessRewardSettings.rewardType}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, rewardType: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed">Fixed Amount Discount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Discount Value</label>
                  <input
                    type="number"
                    min="0"
                    value={businessRewardSettings.discountValue}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, discountValue: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    placeholder={businessRewardSettings.rewardType === 'percentage' ? '10' : '100'}
                  />
                  <p className="text-xs text-slate-500 mt-1">Example: {businessRewardSettings.rewardType === 'percentage' ? '10% OFF' : '₱100 OFF'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Coupon Code (Optional)</label>
                  <input
                    type="text"
                    value={businessRewardSettings.customCode}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, customCode: e.target.value.toUpperCase() }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100 font-mono"
                    placeholder="SAVE100"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave blank to auto-generate a unique code when a customer qualifies.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Claim Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={businessRewardSettings.claimLimit}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, claimLimit: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    placeholder="100"
                  />
                  <p className="text-xs text-slate-500 mt-1">Example: first 100 qualified customers only</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Coupon Expiration</label>
                  <input
                    type="date"
                    value={businessRewardSettings.expirationDate}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, expirationDate: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">Set the date when auto-generated coupons will expire.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Order for Redemption</label>
                  <input
                    type="number"
                    min="0"
                    value={businessRewardSettings.redemptionMinimum}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, redemptionMinimum: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    placeholder="Optional"
                  />
                  <p className="text-xs text-slate-500 mt-1">Optional spend required before the coupon can be redeemed.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Coupon Description</label>
                  <textarea
                    rows={3}
                    value={businessRewardSettings.description}
                    onChange={(e) => setBusinessRewardSettings((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    placeholder="Reward coupon for your next order"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">Customers who meet the reward criteria will automatically receive a unique coupon code after order completion.</p>
              <button
                disabled={savingRewardSettings}
                onClick={saveRewardSettings}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingRewardSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-3 py-6 sm:px-4 sm:py-8">
          <div className="mx-auto flex w-full max-w-full sm:max-w-md max-h-[90vh] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/10">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Create Coupons</h3>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Number of Coupons
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={numberOfCodes}
                    onChange={(e) => setNumberOfCodes(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="1"
                  />
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                    Generate multiple coupons with random codes, or 1 coupon with custom code
                  </p>
                </div>

              {numberOfCodes === '1' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Custom Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-mono"
                    placeholder="e.g., SAVE20"
                    maxLength={20}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount Type
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'percentage' | 'fixed'})}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (PHP)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder={formData.discount_type === 'percentage' ? "10" : "50"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  rows={3}
                  placeholder="e.g., New customer discount"
                />
              </div>
              </div>
              <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCoupon}
                  disabled={generatingCodes || !formData.discount_value}
                  className="rounded-2xl bg-purple-600 px-3 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingCodes && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  Create {numberOfCodes} Coupon{numberOfCodes !== '1' ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Coupon Modal */}
      {showViewModal && selectedCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-6 sm:px-4 sm:py-8">
          <div className="w-full max-w-full sm:max-w-md max-h-[90vh] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/10">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Coupon Details</h3>
            </div>
            <div className="max-h-[calc(90vh-6rem)] overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-500">Code</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                  <code className="bg-slate-100 px-2 py-1 rounded-lg text-sm sm:text-base font-mono font-bold break-all">
                    {selectedCoupon.code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedCoupon.code)}
                    className="text-slate-400 hover:text-slate-600 p-2"
                    title="Copy code"
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500">Discount</label>
                  <p className="text-sm sm:text-base font-semibold text-slate-900 mt-1">
                    {selectedCoupon.discount_type === 'percentage'
                      ? `${selectedCoupon.discount_value}%`
                      : formatCurrency(selectedCoupon.discount_value)
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500">Usage</label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {selectedCoupon.usage_count}/{selectedCoupon.usage_limit}
                  </p>
                </div>
              </div>

              {selectedCoupon.description && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Description</label>
                  <p className="text-slate-900 mt-1">{selectedCoupon.description}</p>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-500">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs sm:text-sm font-semibold rounded-full mt-1 ${
                  selectedCoupon.is_active && selectedCoupon.usage_count < selectedCoupon.usage_limit
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedCoupon.is_active && selectedCoupon.usage_count < selectedCoupon.usage_limit ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500">Expires</label>
                <p className="text-slate-900 mt-1">
                  {selectedCoupon.expires_at
                    ? new Date(selectedCoupon.expires_at).toLocaleString()
                    : 'Never expires'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500">Created</label>
                <p className="text-slate-900 mt-1">
                  {new Date(selectedCoupon.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="rounded-2xl bg-slate-900 px-3 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </PageShell>
  );
}
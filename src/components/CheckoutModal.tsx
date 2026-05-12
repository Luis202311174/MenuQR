"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faX, faChevronLeft, faChevronRight, faCheck, faShoppingCart, faTag, faUsers, faCreditCard, faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/lib/supabaseClient";

type CartItem = {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  qty: number;
  base_price: number;
  total?: number;
  selected_options?: {
    group_name: string;
    option_name: string;
    price_modifier: number;
  }[];
};

type CheckoutStep = "cart-review" | "discount" | "guests" | "payment" | "summary";

type SubmittedOrderDetails = {
  discountType: "none" | "senior" | "pwd" | "promo";
  totalGuests: number;
  seniorCount: number;
  discountAmount: number;
  paymentMethod: "cash" | "gcash";
  cartTotal: number;
  finalAmount: number;
  promoCode?: string;
};

interface CheckoutModalProps {
  isOpen: boolean;
  cartItems: CartItem[];
  cartTotal: number;
  businessName?: string;
  business?: {
    id?: string;
    cash_enabled?: boolean;
    gcash_enabled?: boolean;
  };
  onClose: () => void;
  onSubmitOrder: (orderData: {
    discountType: "none" | "senior" | "pwd" | "promo";
    totalGuests: number;
    seniorCount: number;
    discountAmount: number;
    paymentMethod: "cash" | "gcash";
    promoCode?: string;
    couponId?: string;
  }) => Promise<void>;
  onRemoveCartItem: (index: number) => void;
  isSubmitting?: boolean;
  statusMessage?: string | null;
  submissionComplete?: boolean;
  submittedOrderDetails?: SubmittedOrderDetails | null;
  orderInProgress?: boolean;
  orderInProgressMessage?: string | null;
}

export default function CheckoutModal({
  isOpen,
  cartItems,
  cartTotal,
  businessName = "Restaurant",
  business,
  onClose,
  onSubmitOrder,
  onRemoveCartItem,
  isSubmitting = false,
  statusMessage = null,
  submissionComplete = false,
  submittedOrderDetails = null,
  orderInProgress = false,
  orderInProgressMessage = null,
}: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("cart-review");
  const [discountType, setDiscountType] = useState<"none" | "senior" | "pwd" | "promo">("none");
  const [totalGuests, setTotalGuests] = useState(1);
  const [seniorCount, setSeniorCount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash">("cash");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; couponId?: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }

    setPromoError(null);
    setAppliedPromo(null);

    if (!business?.id) {
      setPromoError("Unable to validate promo code without business information.");
      return;
    }

    try {
      // Call Supabase function to validate coupon
      const { data, error } = await supabase.rpc('validate_and_apply_coupon', {
        p_coupon_code: promoCode.trim(),
        p_business_id: business.id,
        p_order_total: cartTotal,
      });

      if (error) {
        console.error("Supabase coupon RPC error:", error, { promoCode, businessId: business.id });
        setAppliedPromo(null);
        setPromoError(error.message || "Error validating coupon. Please try again.");
        return;
      }

      const normalizedData = (() => {
        if (data == null) return null;
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch {
            return null;
          }
        }
        if (Array.isArray(data)) {
          return data[0] ?? null;
        }
        return data;
      })();

      if (!normalizedData || typeof normalizedData !== 'object') {
        console.error("Unexpected coupon validation response:", data);
        setPromoError("Invalid coupon validation response. Please try again.");
        return;
      }

      if (normalizedData.valid) {
        setAppliedPromo({
          code: promoCode.trim().toUpperCase(),
          discount: normalizedData.discount_amount,
          couponId: normalizedData.coupon_id,
        });
        setPromoError(null);
      } else {
        setAppliedPromo(null);
        setPromoError(normalizedData.message || "Invalid coupon code");
      }
    } catch (error: any) {
      console.error("Error validating coupon:", error, { promoCode, businessId: business?.id });
      setAppliedPromo(null);
      setPromoError("Error validating coupon. Please try again.");
    }
  };

  const SENIOR_DISCOUNT_PERCENT = 0.2; // 20% for senior/PWD
  const effectiveSeniorCount = Math.min(Math.max(0, seniorCount), totalGuests);
  const perGuestShare = cartTotal / Math.max(1, totalGuests);
  const hasCartItems = cartItems.length > 0;
  
  let discountAmount = 0;
  if (discountType === "senior" || discountType === "pwd") {
    discountAmount = effectiveSeniorCount === 0 ? 0 : Math.round(perGuestShare * effectiveSeniorCount * SENIOR_DISCOUNT_PERCENT * 100) / 100;
  } else if (discountType === "promo" && appliedPromo) {
    discountAmount = appliedPromo.discount;
  }
  
  const finalTotal = Math.max(0, cartTotal - discountAmount);

  const handleBack = () => {
    const steps: CheckoutStep[] = ["cart-review", "discount", "guests", "payment", "summary"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentStep === "cart-review") {
      if (!hasCartItems) {
        setCartError("Your cart is empty. Add items to continue.");
        return;
      }
      setCartError(null);
    }

    if (currentStep === "discount" && discountType === "promo" && !appliedPromo) {
      // Prevent proceeding if promo is selected but not successfully applied
      setPromoError("Please apply a valid promo code or select No Discount.");
      return;
    }

    if (currentStep === "guests") {
      if (totalGuests < 1) {
        setGuestError("Enter the number of guests.");
        return;
      }
      if (discountType === "senior" || discountType === "pwd") {
        if (effectiveSeniorCount < 1) {
          setGuestError(`Enter how many ${discountType === "senior" ? "Senior" : "PWD"} guests are dining.`);
          return;
        }
        if (effectiveSeniorCount > totalGuests) {
          setGuestError("Senior/PWD count cannot exceed total guests.");
          return;
        }
      }
      setGuestError(null);
    }

    const steps: CheckoutStep[] = ["cart-review", "discount", "guests", "payment", "summary"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleSubmit = async () => {
    if (!hasCartItems || isSubmitting || localSubmitting || orderInProgress) return;

    setLocalSubmitting(true);
    try {
      await onSubmitOrder({
        discountType,
        totalGuests,
        seniorCount: effectiveSeniorCount,
        discountAmount,
        paymentMethod,
        promoCode: appliedPromo?.code,
        couponId: appliedPromo?.couponId,
      });
      // Only close on success
      onClose();
    } catch (error: any) {
      console.error("Order submission error in modal:", error);
      // Don't close on error - let user retry
    } finally {
      setLocalSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    switch (currentStep) {
      case "cart-review":
        return "Review Your Order";
      case "discount":
        return "Discount Information";
      case "guests":
        return "Number of Guests";
      case "payment":
        return "Payment Method";
      case "summary":
        return "Order Summary";
      default:
        return "";
    }
  };

  const getStepNumber = () => {
    const steps: CheckoutStep[] = ["cart-review", "discount", "guests", "payment", "summary"];
    return steps.indexOf(currentStep) + 1;
  };

  const getStepInfo = () => {
    const steps = [
      { id: "cart-review", title: "Review Order", description: "Review your items", icon: faShoppingCart },
      { id: "discount", title: "Discount", description: "Apply discount if eligible", icon: faTag },
      { id: "guests", title: "Guests", description: "Number of diners", icon: faUsers },
      { id: "payment", title: "Payment", description: "Choose payment method", icon: faCreditCard },
      { id: "summary", title: "Confirm", description: "Review & submit order", icon: faClipboardList },
    ];
    return steps;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 lg:items-center lg:justify-center">
      <div className="w-full max-w-md h-[90vh] lg:h-auto lg:max-h-[90vh] rounded-t-[24px] lg:rounded-[32px] bg-white shadow-lg flex flex-col lg:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 lg:px-6 py-3 lg:py-5 flex-shrink-0">
          <h2 className="text-lg lg:text-xl font-bold text-slate-900">{getStepTitle()}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
            disabled={isSubmitting || localSubmitting}
          >
            <FontAwesomeIcon icon={faX} className="text-slate-600 text-sm lg:text-base" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage ? (
          <div className="rounded-xl lg:rounded-2xl border border-blue-100 bg-blue-50 px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-blue-900 mx-4 lg:mx-6 mt-2 lg:mt-4">
            {statusMessage}
          </div>
        ) : null}

        {submissionComplete && submittedOrderDetails ? (
          <div className="rounded-xl lg:rounded-2xl border border-slate-200 bg-slate-50 px-3 lg:px-4 py-2 lg:py-3 mx-4 lg:mx-6 mt-2 lg:mt-3 text-xs lg:text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₱{submittedOrderDetails.cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                {submittedOrderDetails.discountType === "none"
                  ? "Discount"
                  : submittedOrderDetails.discountType === "senior"
                  ? "Senior Discount"
                  : submittedOrderDetails.discountType === "pwd"
                  ? "PWD Discount"
                  : `Promo (${submittedOrderDetails.promoCode})`}
              </span>
              <span className="font-semibold text-slate-900">-₱{submittedOrderDetails.discountAmount.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-semibold text-slate-900">
              <span>Total</span>
              <span>₱{submittedOrderDetails.finalAmount.toFixed(2)}</span>
            </div>
          </div>
        ) : null}

        {/* Enhanced Step Indicator */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 lg:px-6 py-3 lg:py-5 border-b border-slate-200 flex-shrink-0">
          {/* Progress Bar */}
          <div className="flex gap-1.5 lg:gap-2 mb-3 lg:mb-5">
            {getStepInfo().map((step, index) => (
              <div
                key={step.id}
                className={`h-1 lg:h-1.5 flex-1 rounded-full transition duration-300 ${
                  index < getStepNumber() ? "bg-[#4f65ff]" : index === getStepNumber() - 1 ? "bg-[#4f65ff]" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
          
          {/* Step Info */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-tight">
                Step {getStepNumber()} of 5
              </p>
              <h3 className="text-base lg:text-lg font-bold text-slate-900 mt-0.5 truncate">{getStepTitle()}</h3>
              <p className="text-xs lg:text-sm text-slate-600 mt-0.5 line-clamp-1">
                {getStepInfo()[getStepNumber() - 1]?.description}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex h-10 lg:h-12 w-10 lg:w-12 items-center justify-center rounded-full bg-[#4f65ff] text-white flex-shrink-0">
                <FontAwesomeIcon icon={getStepInfo()[getStepNumber() - 1]?.icon || faShoppingCart} className="text-base lg:text-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 lg:py-6 min-h-0">
          {/* Cart Review Step */}
          {currentStep === "cart-review" && (
            <div className="space-y-2 lg:space-y-4">
              {!hasCartItems ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-base font-semibold text-slate-900">Your cart is empty</p>
                  <p className="mt-2 text-sm text-slate-600">Add items to your cart before continuing to checkout.</p>
                </div>
              ) : (
                <>
                  {cartItems.map((item, index) => (
                    <div key={index} className="relative flex justify-between rounded-lg bg-slate-50 p-2 lg:p-3 pr-12 lg:pr-14">
                      <button
                        type="button"
                        onClick={() => onRemoveCartItem(index)}
                        className="absolute right-2 lg:right-3 top-2 lg:top-3 rounded-full p-1.5 lg:p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Remove ${item.name}`}
                      >
                        <FontAwesomeIcon icon={faX} className="text-xs lg:text-base" />
                      </button>
                      <div className="flex-1 pr-8 lg:pr-10 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm lg:text-base truncate">{item.name}</p>
                        <p className="text-xs lg:text-sm text-slate-600">Qty: {item.qty}</p>
                        {item.selected_options && item.selected_options.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.selected_options.map((opt, idx) => (
                              <p key={idx} className="text-xs text-slate-500 line-clamp-1">
                                • {opt.group_name}: {opt.option_name}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="min-w-[60px] lg:min-w-[72px] text-right font-semibold text-slate-900 text-sm lg:text-base">₱{(item.total || item.price * item.qty).toFixed(2)}</p>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">Tap the X to remove an item from your order.</p>
                  <div className="border-t border-slate-200 pt-3 lg:pt-4">
                    <div className="flex justify-between text-base lg:text-lg font-bold text-slate-900">
                      <span>Subtotal</span>
                      <span>₱{cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
              {cartError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {cartError}
                </div>
              )}
            </div>
          )}

          {/* Discount Step */}
          {currentStep === "discount" && (
            <div className="space-y-2 lg:space-y-4">
              <p className="text-xs lg:text-sm text-slate-600">Do you have a discount?</p>
              {[
                { type: "none" as const, label: "No Discount", description: "Regular Price" },
                { type: "senior" as const, label: "Senior Citizen", description: "20% Discount" },
                { type: "pwd" as const, label: "PWD (Person with Disability)", description: "20% Discount" },
                { type: "promo" as const, label: "Promo Code", description: "Enter a coupon or promo code" },
              ].map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    setDiscountType(option.type);
                    if (option.type !== "promo") {
                      setAppliedPromo(null);
                      setPromoCode("");
                      setPromoError(null);
                    }
                  }}
                  className={`w-full rounded-lg lg:rounded-2xl border-2 p-3 lg:p-4 text-left transition ${
                    discountType === option.type
                      ? "border-[#4f65ff] bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm lg:text-base">{option.label}</p>
                      <p className="text-xs lg:text-sm text-slate-600">{option.description}</p>
                    </div>
                    {discountType === option.type && (
                      <FontAwesomeIcon icon={faCheck} className="text-[#4f65ff] text-sm lg:text-base" />
                    )}
                  </div>
                </button>
              ))}

              {discountType === "promo" && (
                <div className="mt-4 p-4 border rounded-2xl bg-white shadow-sm space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Enter Promo Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. DISCOUNT10"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoError(null);
                      }}
                      className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f65ff]"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={!promoCode.trim()}
                      className="bg-[#4f65ff] text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-[#3f52e3] transition disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-red-600">{promoError}</p>}
                  {appliedPromo && (
                    <p className="text-xs text-green-600 font-semibold">
                      Promo applied! ₱{appliedPromo.discount.toFixed(2)} off.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Guests Step */}
          {currentStep === "guests" && (
            <div className="space-y-3 lg:space-y-5">
              <div className="rounded-2xl lg:rounded-3xl border border-slate-200 bg-white p-3 lg:p-5 shadow-sm">
                <p className="text-xs lg:text-sm text-slate-600 mb-3 lg:mb-4">How many guests will dine?</p>
                <div className="flex items-center justify-center gap-3 lg:gap-4">
                  <button
                    onClick={() => setTotalGuests(Math.max(1, totalGuests - 1))}
                    className="flex h-11 lg:h-14 w-11 lg:w-14 items-center justify-center rounded-full bg-slate-100 text-lg lg:text-2xl font-bold text-slate-700 shadow-sm hover:bg-slate-200"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={totalGuests}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setTotalGuests(Number.isNaN(value) ? 1 : Math.max(1, value));
                    }}
                    className="h-14 lg:h-16 w-24 lg:w-28 rounded-[24px] lg:rounded-[28px] border border-slate-200 bg-slate-50 text-center text-2xl lg:text-3xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setTotalGuests(totalGuests + 1)}
                    className="flex h-11 lg:h-14 w-11 lg:w-14 items-center justify-center rounded-full bg-slate-100 text-lg lg:text-2xl font-bold text-slate-700 shadow-sm hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>
                <p className="mt-3 lg:mt-4 text-center text-xs lg:text-sm text-slate-500">Guest(s)</p>
              </div>

              {(discountType === "senior" || discountType === "pwd") && (
                <div className="rounded-2xl lg:rounded-3xl border border-slate-200 bg-white p-3 lg:p-5 shadow-sm">
                  <p className="text-xs lg:text-sm text-slate-600 mb-3 lg:mb-4">How many {discountType === "senior" ? "Senior" : "PWD"} guests?</p>
                  <div className="flex items-center justify-center gap-3 lg:gap-4">
                    <button
                      onClick={() => setSeniorCount(Math.max(0, seniorCount - 1))}
                      className="flex h-11 lg:h-14 w-11 lg:w-14 items-center justify-center rounded-full bg-slate-100 text-lg lg:text-2xl font-bold text-slate-700 shadow-sm hover:bg-slate-200"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={totalGuests}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={effectiveSeniorCount}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setSeniorCount(Number.isNaN(value) ? 0 : Math.min(totalGuests, Math.max(0, value)));
                      }}
                      className="h-14 lg:h-16 w-24 lg:w-28 rounded-[24px] lg:rounded-[28px] border border-slate-200 bg-slate-50 text-center text-2xl lg:text-3xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => setSeniorCount(Math.min(totalGuests, seniorCount + 1))}
                      className="flex h-11 lg:h-14 w-11 lg:w-14 items-center justify-center rounded-full bg-slate-100 text-lg lg:text-2xl font-bold text-slate-700 shadow-sm hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-3 lg:mt-4 text-center text-xs lg:text-sm text-slate-500">{discountType === "senior" ? "Senior" : "PWD"} guest(s)</p>
                </div>
              )}

              {guestError && <p className="text-center text-xs lg:text-sm text-red-600">{guestError}</p>}
            </div>
          )}

          {/* Payment Step */}
          {currentStep === "payment" && (
            <div className="space-y-2 lg:space-y-4">
              <p className="text-xs lg:text-sm text-slate-600">Choose your payment method</p>
              {[
                { type: "cash" as const, label: "Cash", enabled: business?.cash_enabled !== false },
                { type: "gcash" as const, label: "GCash", enabled: business?.gcash_enabled !== false },
              ].map((option) => (
                <button
                  key={option.type}
                  onClick={() => option.enabled && setPaymentMethod(option.type)}
                  disabled={!option.enabled}
                  className={`w-full rounded-lg lg:rounded-2xl border-2 p-3 lg:p-4 text-left transition ${
                    !option.enabled
                      ? "border-slate-200 bg-slate-50 opacity-50"
                      : paymentMethod === option.type
                        ? "border-[#4f65ff] bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 text-sm lg:text-base">{option.label}</p>
                    {paymentMethod === option.type && (
                      <FontAwesomeIcon icon={faCheck} className="text-[#4f65ff] text-sm lg:text-base" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Summary Step */}
          {currentStep === "summary" && (
            <div className="space-y-2 lg:space-y-4">
              <div className="rounded-lg lg:rounded-2xl bg-slate-50 p-3 lg:p-4 space-y-2 lg:space-y-3">
                <div className="flex justify-between text-xs lg:text-sm">
                  <span className="text-slate-600">Items Subtotal</span>
                  <span className="font-semibold text-slate-900">₱{cartTotal.toFixed(2)}</span>
                </div>
                {discountType !== "none" && (
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span className="text-slate-600">
                      {discountType === "senior" ? "Senior Discount (20%)" : discountType === "pwd" ? "PWD Discount (20%)" : `Promo (${appliedPromo?.code})`}
                    </span>
                    <span className="font-semibold text-emerald-600">−₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 lg:pt-3 flex justify-between">
                  <span className="font-bold text-slate-900 text-sm lg:text-base">Total Amount</span>
                  <span className="text-lg lg:text-2xl font-bold text-slate-900">₱{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-lg lg:rounded-2xl bg-slate-50 p-3 lg:p-4 space-y-1.5 lg:space-y-2">
                <div className="flex justify-between text-xs lg:text-sm">
                  <span className="text-slate-600">Guests</span>
                  <span className="font-semibold text-slate-900">{totalGuests}</span>
                </div>
                {(discountType === "senior" || discountType === "pwd") && (
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span className="text-slate-600">{discountType === "senior" ? "Senior" : "PWD"} guests</span>
                    <span className="font-semibold text-slate-900">{effectiveSeniorCount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs lg:text-sm">
                  <span className="text-slate-600">Discount</span>
                  <span className="font-semibold text-slate-900">
                    {discountType === "none" ? "None" : discountType === "senior" ? "Senior (20%)" : discountType === "pwd" ? "PWD (20%)" : "Promo Applied"}
                  </span>
                </div>
                <div className="flex justify-between text-xs lg:text-sm">
                  <span className="text-slate-600">Payment Method</span>
                  <span className="font-semibold text-slate-900">{paymentMethod === "cash" ? "Cash" : "GCash"}</span>
                </div>
              </div>
              {orderInProgress && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                  {orderInProgressMessage ||
                    "Order in Progress — your current order is still active. New orders can be placed once the current order has been served."}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Footer Navigation */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-200 px-4 lg:px-6 py-3 lg:py-4 flex-shrink-0">
          <div className="flex gap-2 lg:gap-3">
            {currentStep !== "cart-review" && (
              <button
                onClick={handleBack}
                disabled={isSubmitting || localSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 rounded-xl lg:rounded-2xl border-2 border-slate-300 py-2 lg:py-3 font-semibold text-sm lg:text-base text-slate-700 hover:bg-white hover:border-slate-400 transition disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-xs lg:text-sm" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
            <button
              onClick={currentStep === "summary" ? handleSubmit : handleNext}
              disabled={
                isSubmitting ||
                localSubmitting ||
                submissionComplete ||
                orderInProgress ||
                (currentStep === "cart-review" && !hasCartItems)
              }
              className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 rounded-xl lg:rounded-2xl bg-gradient-to-r from-[#4f65ff] to-[#8e7ffd] py-2 lg:py-3 font-semibold text-sm lg:text-base text-white hover:shadow-xl transition disabled:opacity-50"
            >
              {currentStep === "summary" ? (
                <>
                  {submissionComplete
                    ? "✓ Done"
                    : orderInProgress
                    ? "Order in Progress"
                    : isSubmitting || localSubmitting
                    ? "Submitting..."
                    : "Submit"}
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Next</span>
                  <FontAwesomeIcon icon={faChevronRight} className="text-xs lg:text-sm" />
                </>
              )}
            </button>
          </div>
          
          {/* Step Summary */}
          <div className="mt-2 lg:mt-4 pt-2 lg:pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Progress</span>
              <span className="font-semibold text-[#4f65ff]">{getStepNumber()}/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

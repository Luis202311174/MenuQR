"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;

  initialCash?: boolean;
  initialGcash?: boolean;

  onSave: (data: {
    cash: boolean;
    gcash: boolean;
  }) => void;
};

export default function BusinessSettingsPaymentModal({
  open,
  onClose,
  initialCash = true,
  initialGcash = false,
  onSave,
}: Props) {
  const [cash, setCash] = useState(initialCash);
  const [gcash, setGcash] = useState(initialGcash);

  useEffect(() => {
    if (open) {
        setCash(initialCash);
        setGcash(initialGcash);
    }
    }, [open, initialCash, initialGcash]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
        
        {/* HEADER */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            Payment Settings
          </h2>
          <p className="text-sm text-slate-500">
            Manage accepted payment methods
          </p>
        </div>

        {/* OPTIONS */}
        <div className="space-y-4">
          
          {/* CASH */}
          <label className="flex items-center justify-between p-4 border rounded-2xl">
            <div>
              <p className="font-semibold text-slate-900">Cash</p>
              <p className="text-xs text-slate-500">Enabled by default</p>
            </div>

            <input
              type="checkbox"
              checked={cash}
              onChange={(e) => setCash(e.target.checked)}
              className="h-5 w-5"
            />
          </label>

          {/* GCASH */}
          <label className="flex items-center justify-between p-4 border rounded-2xl">
            <div>
              <p className="font-semibold text-slate-900">GCash</p>
              <p className="text-xs text-slate-500">Digital payment option</p>
            </div>

            <input
              type="checkbox"
              checked={gcash}
              onChange={(e) => setGcash(e.target.checked)}
              className="h-5 w-5"
            />
          </label>
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => onSave({ cash, gcash })}
            className="flex-1 bg-slate-900 text-white py-2 rounded-xl font-semibold"
          >
            Save
          </button>

          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 py-2 rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
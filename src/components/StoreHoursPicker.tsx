"use client";

import { useState, useEffect } from "react";

type Props = {
  value?: { open: string; close: string };
  onChange: (hours: { open: string; close: string }) => void;
};

export default function StoreHoursPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(value?.open || "");
  const [close, setClose] = useState(value?.close || "");

  useEffect(() => {
    onChange({ open, close });
  }, [open, close, onChange]);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Store Hours
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opening Time */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Opening Time
          </label>
          <input
            type="time"
            value={open}
            onChange={(e) => setOpen(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3"
            required
          />
        </div>

        {/* Closing Time */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Closing Time
          </label>
          <input
            type="time"
            value={close}
            onChange={(e) => setClose(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3"
            required
          />
        </div>
      </div>

      {/* Preview */}
      {open && close && (
        <p className="text-sm text-gray-600">
          Selected: {formatTime(open)} - {formatTime(close)}
        </p>
      )}
    </section>
  );
}

// helper formatter (24h → 12h)
function formatTime(time: string) {
  const [hour, minute] = time.split(":");
  const h = Number(hour);
  const suffix = h >= 12 ? "PM" : "AM";
  const formattedHour = h % 12 || 12;

  return `${formattedHour}:${minute} ${suffix}`;
}
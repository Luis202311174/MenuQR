"use client";

export default function MenuSidebar() {
  return (
    <div className="md:w-48 w-full border-r md:border-r pr-4 mb-6 md:mb-0">

      <h3 className="font-bold mb-4">Filters</h3>

      <div className="flex flex-col gap-2 text-sm">

        <label className="flex gap-2">
          <input type="checkbox" />
          Available
        </label>

        <label className="flex gap-2">
          <input type="checkbox" />
          With Image
        </label>

      </div>

    </div>
  );
}
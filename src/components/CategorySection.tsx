"use client";

import StoreTile from "./StoreTile";

type Business = {
  id: string;
  name: string;
  address: string;
  store_hours: string;
  logo_url?: string;
  slug: string;
};

type CategorySectionProps = {
  title: string;
  stores: Business[];
  columns: number;
};

export default function CategorySection({
  title,
  stores,
  columns,
}: CategorySectionProps) {
  return (
    <section className="mb-10">
      {/* CATEGORY TITLE */}
      <h2 className="text-2xl font-bold mb-4 text-[#111]">{title}</h2>

      {/* GRID */}
      <div
        className={`grid gap-4 ${
          columns === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {stores.map((store) => (
          <StoreTile
            key={store.id}
            name={store.name}
            address={store.address}
            store_hours={store.store_hours}
            logo_url={store.logo_url}
            slug={store.slug}
          />
        ))}
      </div>
    </section>
  );
}
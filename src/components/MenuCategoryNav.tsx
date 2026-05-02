"use client";

type Props = {
  categories: string[];
};

export default function MenuCategoryNav({ categories }: Props) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 flex gap-4 sm:gap-8 py-4 overflow-x-auto">
    {categories.map((cat) => (
      <button
        key={cat}
        className="font-semibold text-gray-700 hover:text-black whitespace-nowrap px-2 sm:px-4 py-1 rounded-md border border-gray-200"
      >
        {cat}
      </button>
    ))}
</div>
  );
}
"use client";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  status?: string;
};

export default function MenuGrid({
  items,
  onAddToCart,
  onViewItem,
  isDineIn, // <- add this prop
}: {
  items: MenuItem[];
  onAddToCart?: (item: MenuItem) => void;
  onViewItem?: (item: MenuItem) => void;
  isDineIn?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 flex-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="border border-gray-300 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white transform hover:scale-105"
        >
          <div className="h-40 w-full bg-gray-200 overflow-hidden">
            {item.image_url && (
              <img src={item.image_url} className="w-full h-full object-cover" />
            )}
          </div>

          <div className="p-4">
            <div className="mb-2">
              <h3 className="font-black text-lg text-gray-900">{item.name}</h3>
              <p className="text-xs text-red-600 uppercase tracking-wider font-bold">{item.category || "Menu"}</p>
            </div>

            <div className="border-t border-gray-200 pt-3 mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-2xl font-black text-[#E23838]">₱{item.price}</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  item.status === "available"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {item.status === "available" ? "Available" : "Not Available"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {onViewItem && isDineIn && (
                <button
                  onClick={() => onViewItem(item)}
                  className="flex-1 rounded-lg bg-[#E23838] px-3 py-2 text-sm font-bold text-white hover:bg-[#c22f2f] transition-all shadow-md hover:shadow-lg"
                >
                  View
                </button>
              )}
              {onAddToCart && isDineIn && (
                <button
                  onClick={() => onAddToCart(item)}
                  disabled={item.status !== "available"}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold text-white transition-all shadow-md hover:shadow-lg ${
                    item.status === "available"
                      ? "bg-[#E23838] hover:bg-[#c22f2f]"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Add
                </button>
              )}
              {!isDineIn && (
                <div className="flex-1 rounded-lg bg-gray-100 border border-gray-300 px-3 py-2 text-xs text-gray-700 text-center font-semibold flex items-center justify-center">
                  Scan Table QR to Order
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
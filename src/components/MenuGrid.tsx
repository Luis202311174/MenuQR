"use client";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  availability?: boolean;
  description?: string;
  menu_desc?: string;
};

export default function MenuGrid({
  items,
  onAddToCart,
  viewItem,
  setViewItem,
  isDineIn,
}: {
  items: MenuItem[];
  onAddToCart?: (item: MenuItem) => void;
  viewItem?: MenuItem | null;
  setViewItem?: (item: MenuItem | null) => void;
  isDineIn?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 flex-1">
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
                  item.availability
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {item.availability ? "Available" : "Not Available"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {setViewItem && isDineIn && (
                <button onClick={() => setViewItem(item)}
                  className="flex-1 rounded-lg bg-[#E23838] px-3 py-2 text-sm font-bold text-white hover:bg-[#c22f2f] transition-all shadow-md hover:shadow-lg"
                >
                  View
                </button>
              )}
              {onAddToCart && isDineIn && (
                <button
                  onClick={() => onAddToCart(item)}
                  disabled={!item.availability}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold text-white transition-all shadow-md hover:shadow-lg ${
                    item.availability === true
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

      {viewItem && setViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border-2 border-black bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#E23838] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {viewItem.name}
              </h3>
              <button
                onClick={() => setViewItem(null)}
                className="rounded-lg border border-white px-3 py-1 text-sm font-semibold text-white hover:bg-white hover:text-[#E23838] transition"
              >
                Back
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)] gap-4 p-6">
              <div className="h-44 w-full rounded-xl border-2 border-black bg-gray-100 overflow-hidden">
                {viewItem.image_url ? (
                  <img
                    src={viewItem.image_url}
                    alt={viewItem.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-500">
                    No image
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-base text-[#E23838] font-bold">Description</p>
                <p className="text-gray-700 leading-relaxed">
                  {viewItem.description || viewItem.menu_desc || "No description available."}
                </p>

                <div className="mt-4 border-t border-gray-200 pt-3">
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-2xl font-extrabold text-[#E23838]">
                    ₱{viewItem.price}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-sm text-gray-700">
                    {viewItem.category || "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
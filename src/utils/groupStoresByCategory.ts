import { Business } from "./fetchStores";

export function groupStoresByCategory(stores: Business[]) {
  const restaurant: Business[] = [];
  const stall: Business[] = [];
  const cafe: Business[] = [];
  const other: Business[] = [];

  stores.forEach((store) => {
    const category = store.store_category?.toLowerCase();

    if (category === "restaurant") restaurant.push(store);
    else if (category === "stall") stall.push(store);
    else if (category === "cafe") cafe.push(store);
    else other.push(store);
  });

  return {
    restaurant,
    stall,
    cafe,
    other,
  };
}
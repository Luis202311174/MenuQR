import { supabase } from '@/lib/supabaseClient';

export const fetchTopMenuItems = async () => {
  try {
    // Fetch all available menu items from the database
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, availability')
      .eq('availability', true)
      .limit(16);

    if (error) {
      console.error('Error fetching top menu items:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No menu items found in database');
      return [];
    }

    // Extract unique item names and return up to 16
    const uniqueItems = Array.from(
      new Map(
        data.map((item: any) => [item.id, item.name])
      ).values()
    ) as string[];

    console.log('Fetched', uniqueItems.length, 'top menu items:', uniqueItems);
    return uniqueItems;
  } catch (error) {
    console.error('Error in fetchTopMenuItems:', error);
    return [];
  }
};

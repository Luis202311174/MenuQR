-- Add Nutrition Facts to Menu Items

-- Add nutrition facts columns to menu_items table
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS calories integer,
ADD COLUMN IF NOT EXISTS protein decimal(5,2),
ADD COLUMN IF NOT EXISTS carbs decimal(5,2),
ADD COLUMN IF NOT EXISTS fat decimal(5,2),
ADD COLUMN IF NOT EXISTS fiber decimal(5,2),
ADD COLUMN IF NOT EXISTS sugar decimal(5,2),
ADD COLUMN IF NOT EXISTS sodium integer,
ADD COLUMN IF NOT EXISTS serving_size text,
ADD COLUMN IF NOT EXISTS allergens text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN menu_items.calories IS 'Calories per serving';
COMMENT ON COLUMN menu_items.protein IS 'Protein in grams per serving';
COMMENT ON COLUMN menu_items.carbs IS 'Carbohydrates in grams per serving';
COMMENT ON COLUMN menu_items.fat IS 'Fat in grams per serving';
COMMENT ON COLUMN menu_items.fiber IS 'Fiber in grams per serving';
COMMENT ON COLUMN menu_items.sugar IS 'Sugar in grams per serving';
COMMENT ON COLUMN menu_items.sodium IS 'Sodium in milligrams per serving';
COMMENT ON COLUMN menu_items.serving_size IS 'Serving size description (e.g., "1 cup", "100g")';
COMMENT ON COLUMN menu_items.allergens IS 'Array of common allergens (e.g., ["nuts", "dairy", "gluten"])';

-- Create index for allergen searches
CREATE INDEX IF NOT EXISTS idx_menu_items_allergens
ON menu_items USING GIN (allergens);
-- Add image position support for menu items

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_position varchar(20) DEFAULT 'center';

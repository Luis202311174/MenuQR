DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu_categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.menu_categories ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
    WITH ordered AS (
      SELECT id, (row_number() OVER (PARTITION BY business_id ORDER BY name, id) - 1)::integer AS position
      FROM public.menu_categories
    )
    UPDATE public.menu_categories AS category
    SET sort_order = ordered.position
    FROM ordered
    WHERE category.id = ordered.id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
    WITH ordered AS (
      SELECT id, (row_number() OVER (PARTITION BY business_id, category ORDER BY created_at, id) - 1)::integer AS position
      FROM public.menu_items
    )
    UPDATE public.menu_items AS item
    SET sort_order = ordered.position
    FROM ordered
    WHERE item.id = ordered.id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'option_groups' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.option_groups ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
    WITH ordered AS (
      SELECT id, (row_number() OVER (PARTITION BY business_id ORDER BY created_at, id) - 1)::integer AS position
      FROM public.option_groups
    )
    UPDATE public.option_groups AS group_row
    SET sort_order = ordered.position
    FROM ordered
    WHERE group_row.id = ordered.id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'option_choices' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.option_choices ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
    WITH ordered AS (
      SELECT id, (row_number() OVER (PARTITION BY group_id ORDER BY created_at, id) - 1)::integer AS position
      FROM public.option_choices
    )
    UPDATE public.option_choices AS choice
    SET sort_order = ordered.position
    FROM ordered
    WHERE choice.id = ordered.id;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS menu_categories_business_sort_order_idx
  ON public.menu_categories (business_id, sort_order);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active menu categories" ON public.menu_categories;
CREATE POLICY "Public can read active menu categories"
  ON public.menu_categories FOR SELECT USING (is_active);
GRANT SELECT ON public.menu_categories TO anon, authenticated;

CREATE INDEX IF NOT EXISTS menu_items_business_category_sort_order_idx
  ON public.menu_items (business_id, category, sort_order);

CREATE INDEX IF NOT EXISTS option_groups_business_sort_order_idx
  ON public.option_groups (business_id, sort_order);

CREATE INDEX IF NOT EXISTS option_choices_group_sort_order_idx
  ON public.option_choices (group_id, sort_order);
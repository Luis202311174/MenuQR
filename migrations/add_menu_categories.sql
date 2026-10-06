DO $$
DECLARE
  category_type text;
  category_default text;
BEGIN
  SELECT format_type(attribute.atttypid, attribute.atttypmod), pg_get_expr(column_default.adbin, column_default.adrelid)
  INTO category_type, category_default
  FROM pg_attribute AS attribute
  LEFT JOIN pg_attrdef AS column_default
    ON column_default.adrelid = attribute.attrelid
    AND column_default.adnum = attribute.attnum
  WHERE attribute.attrelid = 'public.menu_items'::regclass
    AND attribute.attname = 'category'
    AND NOT attribute.attisdropped;

  IF category_type IS NULL THEN
    RAISE EXCEPTION 'menu_items.category column was not found.';
  END IF;

  IF category_type <> 'text' THEN
    IF category_default IS NOT NULL THEN
      ALTER TABLE public.menu_items ALTER COLUMN category DROP DEFAULT;
    END IF;

    ALTER TABLE public.menu_items
      ALTER COLUMN category TYPE text USING category::text;

    IF category_default IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.menu_items ALTER COLUMN category SET DEFAULT (%s)::text',
        category_default
      );
    END IF;
  END IF;
END;
$$;

UPDATE public.menu_items
SET category = btrim(other_category), other_category = NULL
WHERE lower(btrim(category)) = 'other'
  AND nullif(btrim(other_category), '') IS NOT NULL;

UPDATE public.menu_items
SET category = 'Other'
WHERE lower(btrim(category)) = 'other';

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_categories_business_name_unique
  ON public.menu_categories (business_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS menu_categories_business_active_idx
  ON public.menu_categories (business_id, is_active);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

INSERT INTO public.menu_categories (business_id, name)
SELECT businesses.id, defaults.name
FROM public.businesses
CROSS JOIN (VALUES ('Meals'), ('Beverage'), ('Solo'), ('Extras'), ('Dessert')) AS defaults(name)
ON CONFLICT DO NOTHING;

INSERT INTO public.menu_categories (business_id, name)
SELECT business_id, min(btrim(category))
FROM public.menu_items
WHERE category IS NOT NULL AND btrim(category) <> ''
GROUP BY business_id, lower(btrim(category))
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.rename_menu_category(
  p_category_id uuid,
  p_business_id uuid,
  p_new_name text
)
RETURNS SETOF public.menu_categories
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  old_name text;
  normalized_name text := btrim(coalesce(p_new_name, ''));
BEGIN
  IF normalized_name = '' OR char_length(normalized_name) > 60 THEN
    RAISE EXCEPTION 'Category name must be between 1 and 60 characters.'
      USING ERRCODE = '22023';
  END IF;

  SELECT name INTO old_name
  FROM public.menu_categories
  WHERE id = p_category_id AND business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.menu_items
  SET category = normalized_name
  WHERE business_id = p_business_id
    AND lower(btrim(category)) = lower(btrim(old_name));

  RETURN QUERY
  UPDATE public.menu_categories
  SET name = normalized_name, updated_at = now()
  WHERE id = p_category_id AND business_id = p_business_id
  RETURNING id, business_id, name, is_active, created_at, updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_menu_category(
  p_category_id uuid,
  p_business_id uuid
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  category_name text;
BEGIN
  SELECT name INTO category_name
  FROM public.menu_categories
  WHERE id = p_category_id AND business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found.' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menu_items
    WHERE business_id = p_business_id
      AND lower(btrim(category)) = lower(btrim(category_name))
  ) THEN
    RETURN 'in_use';
  END IF;

  DELETE FROM public.menu_categories
  WHERE id = p_category_id AND business_id = p_business_id;

  RETURN 'deleted';
END;
$$;

REVOKE ALL ON FUNCTION public.rename_menu_category(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_menu_category(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_menu_category(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_menu_category(uuid, uuid) TO service_role;
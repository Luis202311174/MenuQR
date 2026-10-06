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
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.rename_menu_category(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_menu_category(uuid, uuid, text) TO service_role;

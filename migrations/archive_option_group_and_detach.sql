CREATE OR REPLACE FUNCTION public.archive_option_group_and_detach(
  p_group_id uuid,
  p_business_id uuid,
  p_archived boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  updated_group record;
BEGIN
  UPDATE public.option_groups
  SET is_active = NOT p_archived,
      updated_at = now()
  WHERE id = p_group_id
    AND business_id = p_business_id
  RETURNING id, is_active INTO updated_group;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Option group not found.' USING ERRCODE = 'P0002';
  END IF;

  IF p_archived THEN
    DELETE FROM public.item_option_groups
    WHERE option_group_id = p_group_id;
  END IF;

  RETURN jsonb_build_object(
    'id', updated_group.id,
    'is_active', updated_group.is_active
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_option_group_and_detach(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_option_group_and_detach(uuid, uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.set_option_group_items(
  p_group_id uuid,
  p_business_id uuid,
  p_menu_item_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  requested_item_count integer;
  valid_item_count integer;
  group_is_active boolean;
BEGIN
  SELECT is_active
  INTO group_is_active
  FROM public.option_groups
  WHERE id = p_group_id
    AND business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND OR NOT group_is_active THEN
    RAISE EXCEPTION 'Active option group not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(DISTINCT item_id)
  INTO requested_item_count
  FROM unnest(coalesce(p_menu_item_ids, ARRAY[]::uuid[])) AS requested(item_id);

  SELECT count(DISTINCT menu_item.id)
  INTO valid_item_count
  FROM public.menu_items AS menu_item
  WHERE menu_item.business_id = p_business_id
    AND menu_item.id = ANY(coalesce(p_menu_item_ids, ARRAY[]::uuid[]));

  IF requested_item_count <> valid_item_count THEN
    RAISE EXCEPTION 'Every menu item must belong to the option group business.'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.item_option_groups
  WHERE option_group_id = p_group_id;

  INSERT INTO public.item_option_groups (menu_item_id, option_group_id, position)
  SELECT item_id, p_group_id, ordinality - 1
  FROM unnest(coalesce(p_menu_item_ids, ARRAY[]::uuid[])) WITH ORDINALITY AS requested(item_id, ordinality)
  ON CONFLICT (menu_item_id, option_group_id)
  DO UPDATE SET position = EXCLUDED.position;
END;
$$;

REVOKE ALL ON FUNCTION public.set_option_group_items(uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_option_group_items(uuid, uuid, uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.link_option_group_item(
  p_group_id uuid,
  p_business_id uuid,
  p_menu_item_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM 1
  FROM public.option_groups
  WHERE id = p_group_id
    AND business_id = p_business_id
    AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active option group not found.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.menu_items
    WHERE id = p_menu_item_id
      AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'Menu item not found for this business.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.item_option_groups (menu_item_id, option_group_id)
  VALUES (p_menu_item_id, p_group_id)
  ON CONFLICT (menu_item_id, option_group_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.link_option_group_item(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_option_group_item(uuid, uuid, uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  min_select integer NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select integer NOT NULL DEFAULT 1 CHECK (max_select >= 1),
  is_active boolean NOT NULL DEFAULT true,
  is_reusable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT option_groups_selection_bounds CHECK (min_select <= max_select)
);

ALTER TABLE public.option_groups
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.option_groups
  ADD COLUMN IF NOT EXISTS is_reusable boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS option_groups_business_id_idx
  ON public.option_groups (business_id, created_at);

CREATE TABLE IF NOT EXISTS public.option_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_modifier numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS option_choices_group_id_idx
  ON public.option_choices (group_id, created_at);

CREATE TABLE IF NOT EXISTS public.item_option_groups (
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  option_group_id uuid NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (menu_item_id, option_group_id)
);

CREATE INDEX IF NOT EXISTS item_option_groups_group_id_idx
  ON public.item_option_groups (option_group_id);

INSERT INTO public.option_groups (
  id, business_id, name, is_required, min_select, max_select, created_at
)
SELECT
  legacy_group.id,
  menu_item.business_id,
  legacy_group.name,
  coalesce(legacy_group.is_required, false),
  greatest(coalesce(legacy_group.min_select, 0), 0),
  greatest(coalesce(legacy_group.max_select, 1), coalesce(legacy_group.min_select, 0), 1),
  coalesce(legacy_group.created_at, now())
FROM public.menu_item_option_groups AS legacy_group
JOIN public.menu_items AS menu_item ON menu_item.id = legacy_group.menu_item_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.option_choices (
  id, group_id, name, price_modifier, is_available, created_at
)
SELECT id, group_id, name, coalesce(price_modifier, 0), coalesce(is_available, true), coalesce(created_at, now())
FROM public.menu_item_options
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.item_option_groups (menu_item_id, option_group_id, position, created_at)
SELECT menu_item_id, id, 0, created_at
FROM public.menu_item_option_groups
ON CONFLICT (menu_item_id, option_group_id) DO NOTHING;

ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_option_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read option groups" ON public.option_groups;
CREATE POLICY "Public can read option groups"
  ON public.option_groups FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "Public can read option choices" ON public.option_choices;
CREATE POLICY "Public can read option choices"
  ON public.option_choices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read item option group links" ON public.item_option_groups;
CREATE POLICY "Public can read item option group links"
  ON public.item_option_groups FOR SELECT USING (true);

GRANT SELECT ON public.option_groups, public.option_choices, public.item_option_groups TO anon, authenticated;
GRANT ALL ON public.option_groups, public.option_choices, public.item_option_groups TO service_role;

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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.option_groups
    WHERE id = p_group_id AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'Option group not found.' USING ERRCODE = 'P0002';
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
  IF NOT EXISTS (
    SELECT 1 FROM public.option_groups
    WHERE id = p_group_id AND business_id = p_business_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Active option group not found.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.menu_items
    WHERE id = p_menu_item_id AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'Menu item not found for this business.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.item_option_groups (menu_item_id, option_group_id)
  VALUES (p_menu_item_id, p_group_id)
  ON CONFLICT (menu_item_id, option_group_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_option_group_item(
  p_group_id uuid,
  p_business_id uuid,
  p_menu_item_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.option_groups
    WHERE id = p_group_id AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'Option group not found.' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.item_option_groups AS link
  USING public.menu_items AS menu_item
  WHERE link.option_group_id = p_group_id
    AND link.menu_item_id = p_menu_item_id
    AND menu_item.id = p_menu_item_id
    AND menu_item.business_id = p_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_option_group_item(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unlink_option_group_item(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_option_group_item(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlink_option_group_item(uuid, uuid, uuid) TO service_role;
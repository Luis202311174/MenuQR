import { supabase } from "@/lib/supabaseClient";

export const BUSINESS_MODULE_PERMISSIONS = [
  "dashboard",
  "menu",
  "inventory",
  "orders",
  "promotions",
  "reports",
  "tableqr",
  "settings",
] as const;

export type BusinessPermission = (typeof BUSINESS_MODULE_PERMISSIONS)[number];
export type StaffRole = "staff" | "manager" | "admin";

export type BusinessStaffMember = {
  id: string;
  business_id: string;
  user_id: string;
  role: StaffRole;
  permissions: BusinessPermission[];
  created_at: string | null;
  updated_at: string | null;
};

export type BusinessUserContext = {
  userId: string;
  userRole: "owner" | "staff" | "user";
  isOwner: boolean;
  isStaff: boolean;
  staffRole?: StaffRole | null;
  businessId?: string | null;
  businessSlug?: string | null;
  businessName?: string | null;
  permissions: BusinessPermission[];
};

export function canAccessBusinessModule(
  context: BusinessUserContext | null,
  module: BusinessPermission
) {
  if (!context) return false;
  if (context.isOwner) return true;
  if (!context.isStaff) return false;
  return context.permissions?.includes(module);
}

export async function loadBusinessUserContext(
  userId: string
): Promise<BusinessUserContext> {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  const userRole = user?.role || "user";
  const isOwner = userRole === "owner";

  if (isOwner) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id,slug,name")
      .eq("owner_id", userId)
      .single();

    return {
      userId,
      userRole,
      isOwner: true,
      isStaff: false,
      businessId: business?.id || null,
      businessSlug: business?.slug || null,
      businessName: business?.name || null,
      permissions: [...BUSINESS_MODULE_PERMISSIONS],
    };
  }

  const { data: staff, error: staffError } = await supabase
    .from("business_staff")
    .select("business_id,role,permissions")
    .eq("user_id", userId)
    .maybeSingle();

  if (!staff || staffError) {
    return {
      userId,
      userRole,
      isOwner: false,
      isStaff: false,
      permissions: [],
    };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("slug,name")
    .eq("id", staff.business_id)
    .single();

  return {
    userId,
    userRole,
    isOwner: false,
    isStaff: true,
    staffRole: staff.role,
    businessId: staff.business_id,
    businessSlug: business?.slug || null,
    businessName: business?.name || null,
    permissions: staff.permissions || [],
  };
}

export async function fetchBusinessStaffMembers(
  businessId: string
): Promise<BusinessStaffMember[]> {
  const { data, error } = await supabase
    .from("business_staff")
    .select("id,business_id,user_id,role,permissions,created_at,updated_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function addBusinessStaffMember(
  businessId: string,
  userId: string,
  role: StaffRole,
  permissions: BusinessPermission[]
) {
  const { error } = await supabase.from("business_staff").insert([
    {
      business_id: businessId,
      user_id: userId,
      role,
      permissions,
    },
  ]);

  if (error) {
    throw error;
  }
}

export async function updateBusinessStaffMember(
  staffId: string,
  updates: Partial<Pick<BusinessStaffMember, "role" | "permissions">>
) {
  const { error } = await supabase
    .from("business_staff")
    .update(updates)
    .eq("id", staffId);

  if (error) {
    throw error;
  }
}

export async function removeBusinessStaffMember(staffId: string) {
  const { error } = await supabase.from("business_staff").delete().eq("id", staffId);
  if (error) {
    throw error;
  }
}

export async function getUsersByIds(userIds: string[]) {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("users")
    .select("id,email")
    .in("id", userIds);

  if (error) {
    throw error;
  }

  return data || [];
}

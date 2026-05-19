import type { AppRole } from "@/contexts/AuthContext";

// Admin role is now resolved exclusively from the database (`user_roles` table)
// to avoid leaking admin email addresses in the client bundle.
export const ADMIN_EMAILS: string[] = [];

export const isAdminEmail = (_email?: string | null) => false;

export const defaultRoleForEmail = (_email?: string | null): AppRole => "user";

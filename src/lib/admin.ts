import type { AppRole } from "@/contexts/AuthContext";

export const ADMIN_EMAILS = [
  "saputrajaelani423@gmail.com",
  "jaelanisurya8@gmail.com",
];

export const isAdminEmail = (email?: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));

export const defaultRoleForEmail = (email?: string | null): AppRole =>
  isAdminEmail(email) ? "admin" : "user";

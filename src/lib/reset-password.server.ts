import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function resetAdminPassword(email: string, password: string) {
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("User not found");
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
  return { ok: true, id: user.id };
}

import { supabase } from "@/integrations/supabase/client";

export type AttendanceStatus = "present" | "absent" | "leave" | "late";

export const STATUS_META: Record<AttendanceStatus, { label: string; emoji: string; tone: string; hex: string }> = {
  present: { label: "Present", emoji: "✅", tone: "leaf", hex: "oklch(0.79 0.14 150)" },
  absent:  { label: "Absent",  emoji: "❌", tone: "berry", hex: "oklch(0.62 0.22 25)" },
  leave:   { label: "Leave",   emoji: "🏠", tone: "sun", hex: "oklch(0.85 0.15 85)" },
  late:    { label: "Late",    emoji: "⏰", tone: "sky", hex: "oklch(0.72 0.14 235)" },
};

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

export async function fetchCurrentRole() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return { userId: null, isAdmin: false, teacherClassId: null as string | null };
  const { data: roles } = await supabase.from("user_roles").select("role, assigned_class_id").eq("user_id", uid);
  const isAdmin = !!roles?.some((r) => r.role === "admin");
  const teacherClassId = roles?.find((r) => r.role === "teacher")?.assigned_class_id ?? null;
  return { userId: uid, isAdmin, teacherClassId };
}

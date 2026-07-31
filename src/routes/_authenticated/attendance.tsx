import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Save, Zap } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { StudentPhoto } from "@/components/StudentPhoto";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { STATUS_META, fetchCurrentRole, todayISO, type AttendanceStatus } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Mark attendance · Little Millennium" },
      { name: "description", content: "Mark attendance in one tap for your class." },
      { property: "og:title", content: "Mark attendance · Little Millennium" },
      { property: "og:description", content: "Mark attendance in one tap for your class." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [selections, setSelections] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const roleQuery = useQuery({ queryKey: ["role"], queryFn: fetchCurrentRole });
  const isAdmin = roleQuery.data?.isAdmin ?? false;
  const teacherClassId = roleQuery.data?.teacherClassId ?? null;

  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name, display_order").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Default class selection
  useEffect(() => {
    if (classId) return;
    if (!isAdmin && teacherClassId) setClassId(teacherClassId);
    else if (classesQuery.data?.[0]) setClassId(classesQuery.data[0].id);
  }, [isAdmin, teacherClassId, classesQuery.data, classId]);

  const allClasses = classId === "all";

  const studentsQuery = useQuery({
    queryKey: ["students", classId],
    enabled: !!classId,
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("id, full_name, roll_number, admission_number, photo_url, class_id")
        .eq("is_active", true);
      if (!allClasses) query = query.eq("class_id", classId);
      const { data, error } = await query.order("roll_number", { nullsFirst: true });
      if (error) throw error;
      return data;
    },
  });

  const existingQuery = useQuery({
    queryKey: ["attendance", classId, date],
    enabled: !!classId,
    queryFn: async () => {
      let query = supabase.from("attendance").select("student_id, status").eq("date", date);
      if (!allClasses) query = query.eq("class_id", classId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });


  // Seed selections from existing records
  useEffect(() => {
    if (!existingQuery.data) return;
    const seed: Record<string, AttendanceStatus> = {};
    for (const r of existingQuery.data) seed[r.student_id] = r.status as AttendanceStatus;
    setSelections(seed);
  }, [existingQuery.data]);

  const students = studentsQuery.data ?? [];
  const lockedIds = useMemo(
    () => new Set((existingQuery.data ?? []).map((r) => r.student_id)),
    [existingQuery.data],
  );
  const unlockedStudents = useMemo(
    () => students.filter((s) => !lockedIds.has(s.id)),
    [students, lockedIds],
  );
  const classMap = useMemo(
    () => new Map((classesQuery.data ?? []).map((c) => [c.id, c.name] as const)),
    [classesQuery.data],
  );
  const stats = useMemo(() => {
    const s = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const st of students) {
      const v = selections[st.id];
      if (v) s[v]++;
    }
    return s;
  }, [students, selections]);

  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = { ...selections };
    for (const s of unlockedStudents) next[s.id] = status;
    setSelections(next);
  };

  async function save() {
    if (!classId) return;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    const rows = unlockedStudents
      .filter((s) => selections[s.id])
      .map((s) => ({
        student_id: s.id,
        class_id: s.class_id,
        date,
        status: selections[s.id],
        marked_by: uid,
      }));
    if (rows.length === 0) return toast.error("Mark at least one unlocked student first.");

    setSaving(true);
    const { error } = await supabase.from("attendance").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Attendance saved and locked");
    qc.invalidateQueries({ queryKey: ["attendance", classId, date] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display">Mark attendance</h1>
          <p className="text-sm text-muted-foreground">Tap a status for each child. You can save partial and come back.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-card px-3 py-2 shadow-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-40 border-0 bg-transparent p-0 focus-visible:ring-0"
              max={todayISO()}
            />
          </div>
          <Select value={classId} onValueChange={setClassId} disabled={!isAdmin && !!teacherClassId}>
            <SelectTrigger className="w-56 rounded-full bg-card shadow-sm">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {isAdmin && <SelectItem value="all">All classes</SelectItem>}
              {classesQuery.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 p-3">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Zap className="h-3.5 w-3.5" /> Quick mark
        </span>
        {(Object.keys(STATUS_META) as AttendanceStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => markAll(s)}
            className={`rounded-full bg-${STATUS_META[s].tone}/25 px-3 py-1.5 text-xs font-semibold hover:brightness-95`}
          >
            {STATUS_META[s].emoji} All {STATUS_META[s].label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
          {(Object.keys(STATUS_META) as AttendanceStatus[]).map((s) => (
            <span key={s} className="rounded-full bg-muted px-2.5 py-1 font-semibold">
              {STATUS_META[s].emoji} {stats[s]}
            </span>
          ))}
        </div>
      </div>

      {/* Roster */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {studentsQuery.isLoading && (
          <div className="col-span-full rounded-2xl bg-muted p-10 text-center text-muted-foreground">Loading students…</div>
        )}
        {students.length === 0 && !studentsQuery.isLoading && (
          <div className="col-span-full rounded-2xl bg-muted p-10 text-center text-muted-foreground">
            No active students in this class yet.
          </div>
        )}
        {students.map((s) => {
          const sel = selections[s.id];
          const initials = s.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("");
          return (
            <div key={s.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar name={s.full_name} url={s.photo_url} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {allClasses ? `${classMap.get(s.class_id) ?? "—"} · ` : ""}Roll {s.roll_number ?? "—"} · {s.admission_number}
                  </div>
                </div>
                {sel && (
                  <span className={`rounded-full bg-${STATUS_META[sel].tone}/30 px-2.5 py-1 text-xs font-semibold`}>
                    {STATUS_META[sel].emoji} {STATUS_META[sel].label}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(Object.keys(STATUS_META) as AttendanceStatus[]).map((st) => {
                  const active = sel === st;
                  const m = STATUS_META[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelections((p) => ({ ...p, [s.id]: st }))}
                      className={cn(
                        "flex h-14 flex-col items-center justify-center rounded-2xl text-xs font-semibold transition",
                        active
                          ? `bg-${m.tone} text-${m.tone}-foreground shadow-md ring-2 ring-offset-2 ring-${m.tone}`
                          : `bg-${m.tone}/15 text-${m.tone}-foreground hover:bg-${m.tone}/30`,
                      )}
                      aria-pressed={active}
                    >
                      <span className="text-lg leading-none">{m.emoji}</span>
                      <span className="mt-0.5">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {students.length > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-full border border-border bg-card/90 p-3 pl-5 shadow-lg backdrop-blur">
          <div className="text-sm">
            <span className="font-semibold">{Object.keys(selections).length}</span>
            <span className="text-muted-foreground"> of {students.length} marked</span>
          </div>
          <Button onClick={save} disabled={saving} size="lg" className="rounded-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save attendance"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return <StudentPhoto name={name} value={url} className="h-11 w-11 text-sm" />;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchCurrentRole } from "@/lib/attendance";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { StudentPhoto } from "@/components/StudentPhoto";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/students/")({
  head: () => ({
    meta: [
      { title: "Students · Little Millennium Attendance" },
      { name: "description", content: "Browse and search all students, grouped by class." },
      { property: "og:title", content: "Students · Little Millennium Attendance" },
      { property: "og:description", content: "Browse and search all students, grouped by class." },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState<string>("all");
  const roleQuery = useQuery({ queryKey: ["current-role"], queryFn: fetchCurrentRole });

  const classesQuery = useQuery({
    queryKey: ["classes"],

    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name, display_order").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const studentsQuery = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, roll_number, admission_number, mobile_number, class_id, photo_url, is_active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (studentsQuery.data ?? []).filter((s) => {
      if (classId !== "all" && s.class_id !== classId) return false;
      if (!term) return true;
      return (
        s.full_name.toLowerCase().includes(term) ||
        s.admission_number.toLowerCase().includes(term) ||
        (s.mobile_number ?? "").toLowerCase().includes(term)
      );
    });
  }, [studentsQuery.data, q, classId]);

  const classMap = new Map((classesQuery.data ?? []).map((c) => [c.id, c.name] as const));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold font-display">Students</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} students · {classesQuery.data?.length ?? 0} classes</p>
        </div>
        {roleQuery.data?.isAdmin && <AddStudentDialog classes={classesQuery.data ?? []} />}
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, admission #, or parent mobile"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-full pl-9 h-11 bg-card shadow-sm"
          />
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-56 rounded-full bg-card shadow-sm h-11">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classesQuery.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          return (
            <Link
              key={s.id}
              to="/students/$id"
              params={{ id: s.id }}
              className="group rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <StudentPhoto name={s.full_name} value={s.photo_url} className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold group-hover:text-primary">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {classMap.get(s.class_id) ?? "—"} · Roll {s.roll_number ?? "—"}
                  </div>
                </div>
                {!s.is_active && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Inactive</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{s.admission_number}</span>
                <span>{s.mobile_number ?? ""}</span>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-3xl bg-muted p-10 text-center text-muted-foreground">No students match your search.</div>
        )}
      </div>
    </div>
  );
}

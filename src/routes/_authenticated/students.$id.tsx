import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Cake, Phone, Home, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { StudentPhoto } from "@/components/StudentPhoto";
import { STATUS_META, type AttendanceStatus } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/students/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Student · Little Millennium Attendance` },
      { name: "description", content: `Attendance history for student ${params.id}.` },
      { property: "og:title", content: "Student profile · Little Millennium" },
      { property: "og:description", content: "Attendance history and profile." },
    ],
  }),
  component: StudentDetail,
});

function StudentDetail() {
  const { id } = Route.useParams();
  const [monthOffset, setMonthOffset] = useState(0);

  const query = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const [studentRes, attRes] = await Promise.all([
        supabase.from("students").select("*, classes(name)").eq("id", id).maybeSingle(),
        supabase.from("attendance").select("date, status").eq("student_id", id).order("date"),
      ]);
      if (studentRes.error) throw studentRes.error;
      if (attRes.error) throw attRes.error;
      return { student: studentRes.data, attendance: attRes.data ?? [] };
    },
  });

  const s = query.data?.student as any;
  const attendance = query.data?.attendance ?? [];

  const attMap = useMemo(() => {
    const m = new Map<string, AttendanceStatus>();
    for (const r of attendance) m.set(r.date, r.status as AttendanceStatus);
    return m;
  }, [attendance]);

  const totals = useMemo(() => {
    const t = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const r of attendance) t[r.status as AttendanceStatus]++;
    const working = attendance.length;
    const pct = working ? Math.round(((t.present + t.late) / working) * 100) : 0;
    return { ...t, working, pct };
  }, [attendance]);

  const now = new Date();
  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = viewMonth.getDay();
  const cells: Array<{ iso?: string; day?: number }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({});
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d, 12).toISOString().slice(0, 10);
    cells.push({ iso, day: d });
  }

  if (query.isLoading) return <div className="rounded-3xl bg-muted p-10 text-center text-muted-foreground">Loading…</div>;
  if (!s) return <div className="rounded-3xl bg-muted p-10 text-center text-muted-foreground">Student not found.</div>;


  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All students
      </Link>

      <header className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <StudentPhoto name={s.full_name} value={s.photo_url} className="h-20 w-20 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold font-display">{s.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-sky/25 px-2.5 py-0.5 font-semibold text-sky-foreground">{s.classes?.name}</span>
              <span>Roll {s.roll_number ?? "—"}</span>
              <span>·</span>
              <span>{s.admission_number}</span>
            </div>
          </div>
          <div className="grid gap-1 text-right text-sm">
            <div className="text-3xl font-extrabold font-display text-primary">{totals.pct}%</div>
            <div className="text-xs text-muted-foreground">Attendance</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={User} label="Parent" value={s.parent_name || s.father_name || "—"} />
          <Fact icon={Phone} label="Mobile" value={s.mobile_number || "—"} />
          <Fact icon={Cake} label="Date of birth" value={s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : "—"} />
          <Fact icon={Home} label="Address" value={s.address || "—"} />
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold">Student details</h2>
        <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Full name" value={s.full_name} />
          <Detail label="Admission number" value={s.admission_number} />
          <Detail label="Class" value={s.classes?.name} />
          <Detail label="Roll number" value={s.roll_number} />
          <Detail label="Date of birth" value={s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : null} />
          <Detail label="Gender" value={s.gender ? String(s.gender).replace(/^./, (c: string) => c.toUpperCase()) : null} />
          <Detail label="Father's name" value={s.father_name} />
          <Detail label="Mother's name" value={s.mother_name} />
          <Detail label="Parent / guardian" value={s.parent_name} />
          <Detail label="Mobile number" value={s.mobile_number} />
          <Detail label="Emergency contact" value={s.emergency_contact} />
          <Detail label="Admission date" value={s.admission_date ? new Date(s.admission_date).toLocaleDateString() : null} />
          <Detail label="Status" value={s.is_active ? "Active" : "Inactive"} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Detail label="Address" value={s.address} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard tone="leaf" label="Present days" value={totals.present} />
        <SummaryCard tone="berry" label="Absent days" value={totals.absent} />
        <SummaryCard tone="sun" label="Leave" value={totals.leave} />
        <SummaryCard tone="sky" label="Late" value={totals.late} />
      </section>


      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{monthLabel}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonthOffset((v) => v - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-accent">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMonthOffset((v) => v + 1)}
              disabled={monthOffset >= 0}
              className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((c, i) => {
            const status = c.iso ? attMap.get(c.iso) : undefined;
            const isToday = c.iso === new Date().toISOString().slice(0, 10);
            return (
              <div
                key={i}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-2xl border text-sm",
                  !c.iso && "border-transparent",
                  c.iso && !status && "border-border bg-background text-muted-foreground",
                  status && `border-transparent bg-${STATUS_META[status].tone}/30 text-${STATUS_META[status].tone}-foreground font-semibold`,
                  isToday && "ring-2 ring-primary",
                )}
                title={status ? STATUS_META[status].label : ""}
              >
                {c.day && <span>{c.day}</span>}
                {status && <span className="text-xs leading-none mt-0.5">{STATUS_META[status].emoji}</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          {(Object.keys(STATUS_META) as AttendanceStatus[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-full bg-${STATUS_META[k].tone}`} />
              {STATUS_META[k].label}
            </span>
          ))}
          <span className="ml-auto text-muted-foreground">Total working days recorded: {totals.working}</span>
        </div>
      </section>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function SummaryCard({ tone, label, value }: { tone: string; label: string; value: number }) {
  return (
    <div className={`rounded-3xl border border-border bg-${tone}/20 p-5`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-extrabold font-display">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium break-words">{value === null || value === undefined || value === "" ? "—" : value}</div>
    </div>
  );
}

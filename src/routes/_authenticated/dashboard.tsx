import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, CheckCircle2, XCircle, TrendingUp, CalendarDays, School } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { STATUS_META, todayISO, type AttendanceStatus } from "@/lib/attendance";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Little Millennium Attendance" },
      { name: "description", content: "Today at a glance — presence, trends, and class insights." },
      { property: "og:title", content: "Dashboard · Little Millennium Attendance" },
      { property: "og:description", content: "Today at a glance — presence, trends, and class insights." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const today = todayISO();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", today],
    queryFn: async () => {
      const [studentsRes, todayAttRes, historyRes, classesRes] = await Promise.all([
        supabase.from("students").select("id, class_id, is_active"),
        supabase.from("attendance").select("status, class_id").eq("date", today),
        supabase
          .from("attendance")
          .select("date, status, class_id")
          .gte("date", isoDaysAgo(29)),
        supabase.from("classes").select("id, name, display_order").order("display_order"),
      ]);
      if (studentsRes.error) throw studentsRes.error;
      if (todayAttRes.error) throw todayAttRes.error;
      if (historyRes.error) throw historyRes.error;
      if (classesRes.error) throw classesRes.error;
      return {
        students: studentsRes.data ?? [],
        today: todayAttRes.data ?? [],
        history: historyRes.data ?? [],
        classes: classesRes.data ?? [],
      };
    },
  });

  const total = data?.students.filter((s) => s.is_active).length ?? 0;
  const present = data?.today.filter((a) => a.status === "present").length ?? 0;
  const absent = data?.today.filter((a) => a.status === "absent").length ?? 0;
  const late = data?.today.filter((a) => a.status === "late").length ?? 0;
  const leave = data?.today.filter((a) => a.status === "leave").length ?? 0;
  const marked = present + absent + late + leave;
  const pct = marked ? Math.round((present / marked) * 100) : 0;

  // Daily trend (last 14 days)
  const trend = buildTrend(data?.history ?? [], 14);
  // Class-wise attendance today
  const classWise = (data?.classes ?? []).map((c) => {
    const rows = data?.today.filter((a) => a.class_id === c.id) ?? [];
    const p = rows.filter((r) => r.status === "present").length;
    const totalInClass = data?.students.filter((s) => s.class_id === c.id && s.is_active).length ?? 0;
    return { name: shortName(c.name), Present: p, Total: totalInClass };
  });
  // Status breakdown pie (today)
  const statusPie = (["present", "absent", "late", "leave"] as AttendanceStatus[])
    .map((s) => ({ name: STATUS_META[s].label, value: data?.today.filter((a) => a.status === s).length ?? 0, hex: STATUS_META[s].hex }))
    .filter((r) => r.value > 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">{formatLongDate(today)}</div>
          <h1 className="mt-1 text-3xl font-extrabold font-display">Good morning, teacher! ☀️</h1>
        </div>
        <div className="rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-sm">
          Session · {new Date().getFullYear()}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard tone="sky" icon={Users} label="Total students" value={total} />
        <StatCard tone="leaf" icon={CheckCircle2} label="Present today" value={present} />
        <StatCard tone="berry" icon={XCircle} label="Absent today" value={absent} />
        <StatCard tone="sun" icon={TrendingUp} label="Attendance" value={`${pct}%`} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Late" value={late} tone="sky" />
        <MiniStat label="On leave" value={leave} tone="sun" />
        <MiniStat label="Marked" value={`${marked} / ${total}`} tone="leaf" />
        <MiniStat label="Classes" value={data?.classes.length ?? 0} tone="tangerine" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Daily attendance trend</h3>
            <span className="text-xs text-muted-foreground">Last 14 days</span>
          </div>
          <div className="h-64">
            {isLoading ? <Skeleton /> : (
              <ResponsiveContainer>
                <LineChart data={trend} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                  <Line type="monotone" dataKey="Present" stroke="var(--leaf)" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Absent" stroke="var(--berry)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-2 font-display text-lg font-bold">Today's breakdown</h3>
          <div className="h-64">
            {statusPie.length === 0 ? (
              <EmptyChart icon={CalendarDays} text="No attendance marked yet today" />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={4}>
                    {statusPie.map((s, i) => <Cell key={i} fill={s.hex} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Class-wise attendance today</h3>
          <School className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="h-72">
          {isLoading ? <Skeleton /> : (
            <ResponsiveContainer>
              <BarChart data={classWise} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar dataKey="Total" fill="var(--sky)" radius={[10, 10, 0, 0]} />
                <Bar dataKey="Present" fill="var(--leaf)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ tone, icon: Icon, label, value }: { tone: string; icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className={`rounded-3xl border border-border bg-card p-5 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className={`grid h-8 w-8 place-items-center rounded-2xl bg-${tone}/40`}>
          <Icon className={`h-4 w-4 text-${tone}-foreground`} />
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      </div>
      <div className="mt-4 text-3xl font-extrabold font-display">{value}</div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-${tone}/20 p-4`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function Skeleton() { return <div className="h-full w-full animate-pulse rounded-2xl bg-muted" />; }
function EmptyChart({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      <Icon className="mb-2 h-8 w-8" />
      <div className="text-sm">{text}</div>
    </div>
  );
}

function isoDaysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}
function formatLongDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function shortName(n: string) { return n.replace("Developing ", "Dev. ").replace("Emerging ", "Emg. ").replace("Ready To Fly ", "RTF "); }
function buildTrend(rows: { date: string; status: string }[], days: number) {
  const map = new Map<string, { Present: number; Absent: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const off = d.getTimezoneOffset();
    const iso = new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
    map.set(iso, { Present: 0, Absent: 0 });
  }
  for (const r of rows) {
    const bucket = map.get(r.date);
    if (!bucket) continue;
    if (r.status === "present") bucket.Present++;
    else if (r.status === "absent") bucket.Absent++;
  }
  return [...map.entries()].map(([iso, v]) => ({
    label: new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    ...v,
  }));
}

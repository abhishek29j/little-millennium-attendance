import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck, LineChart, Users, Heart, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Little Millennium Attendance — Modern preschool attendance" },
      { name: "description", content: "Mark attendance in one tap, track every child's presence, and see class insights at a glance. Built for Little Millennium teachers and admins." },
      { property: "og:title", content: "Little Millennium Attendance" },
      { property: "og:description", content: "Mark attendance in one tap. Track every child. See insights at a glance." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-12" />
          <div>
            <div className="text-lg font-bold font-display leading-none">Little Millennium</div>
            <div className="text-xs text-muted-foreground">Attendance Management</div>
          </div>
        </div>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sun/40 px-3 py-1 text-xs font-semibold text-sun-foreground">
              <Heart className="h-3.5 w-3.5" /> Built for preschools
            </div>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl font-display">
              Every little one, marked with{" "}
              <span className="bg-gradient-to-r from-primary via-berry to-tangerine bg-clip-text text-transparent">care</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A cheerful, tablet-friendly attendance app for Little Millennium teachers and admins.
              One-tap marking, colourful insights, and a full history for every child.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-105"
              >
                Get started
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                Learn more
              </a>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-leaf" />
              Secure, role-based access. Teachers only see their assigned class.
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-sun/60 blur-2xl" />
            <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-berry/40 blur-2xl" />
            <div className="relative rounded-3xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Today · Developing Roots</div>
                <div className="rounded-full bg-leaf/25 px-3 py-1 text-xs font-semibold text-leaf-foreground">92% present</div>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { name: "Aarav Sharma", status: "Present", tone: "leaf" },
                  { name: "Diya Patel", status: "Present", tone: "leaf" },
                  { name: "Kabir Iyer", status: "Late", tone: "sky" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between rounded-2xl bg-muted/60 p-3">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-full bg-${s.tone}/40 text-sm font-bold`}>
                        {s.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="text-sm font-medium">{s.name}</div>
                    </div>
                    <div className={`rounded-full bg-${s.tone}/30 px-3 py-1 text-xs font-semibold`}>{s.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: CalendarCheck, tone: "sky", title: "One-tap attendance", desc: "Big, friendly buttons for present, absent, leave, and late — perfect for tablets in the classroom." },
            { icon: LineChart, tone: "sun", title: "Beautiful insights", desc: "Class-wise trends and monthly summaries help spot patterns before they matter." },
            { icon: Users, tone: "leaf", title: "Student profiles", desc: "Full history for every child with a friendly calendar view of every day they were with us." },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-${f.tone}/40`}>
                <f.icon className={`h-6 w-6 text-${f.tone}-foreground`} />
              </div>
              <h3 className="mt-4 text-lg font-bold font-display">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

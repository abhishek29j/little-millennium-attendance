import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck, LineChart, Users } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/heroimg.png.asset.json";

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
      <header className="mx-auto flex max-w-6xl flex-col items-center justify-center px-6 py-6 sm:py-10">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo className="h-24" />
          <div className="text-center">
            <div className="text-2xl font-bold font-display leading-none">Little Millennium</div>
            <div className="text-sm text-muted-foreground">Attendance Management</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-2 sm:pt-10">
        <section className="mx-auto max-w-2xl sm:mx-0">
          <div className="text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <div className="inline-flex items-center rounded-full bg-sun/40 px-3 py-1 text-xs font-semibold text-sun-foreground">
                Built for LM Sitapur Road
              </div>
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl font-display sm:mt-4">
              Every little one, marked with{" "}
              <span className="bg-gradient-to-r from-primary via-berry to-tangerine bg-clip-text text-transparent">care</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Welcome to the official Attendance Management System of Little Millennium Sitapur Road Branch, digital attendance platform ensures that attendance is recorded accurately, securely, and effortlessly.
            </p>
            <div className="mt-8 flex justify-center sm:justify-start">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-full bg-primary px-10 py-4 text-lg font-bold text-primary-foreground shadow-lg transition hover:brightness-105"
              >
                Sign in
              </Link>
            </div>
            <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:justify-start">
              <span>Designed and developed by{" "}
                <a href="https://softicetechnologies.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline hover:text-primary/80">
                  Softice technologies
                </a>
              </span>
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

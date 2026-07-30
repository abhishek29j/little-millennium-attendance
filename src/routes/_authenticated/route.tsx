import { createFileRoute, redirect, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, CalendarCheck2, Users, LogOut, Menu, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck2 },
  { to: "/students", label: "Students", icon: Users },
] as const;

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name,email").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      setName(profile?.full_name || profile?.email || userRes.user?.email || "");
      const isAdmin = roles?.some((r) => r.role === "admin");
      setRole(isAdmin ? "Super Admin" : "Teacher");
    })();
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      {/* Top bar (mobile) */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <BrandLogo className="h-9" />
          <span className="font-bold font-display">Little Millennium Attendance</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full bg-muted"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="mx-auto flex max-w-[1400px] gap-6 p-4 md:p-6 lg:p-8">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-x-0 top-14 z-20 mx-4 rounded-3xl border border-border bg-sidebar p-5 shadow-xl transition lg:sticky lg:top-8 lg:mx-0 lg:block lg:h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0",
            mobileOpen ? "block" : "hidden lg:block",
          )}
        >
          <div className="mb-6 hidden items-center gap-3 lg:flex">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-bold font-display">Little Millennium</div>
              <div className="text-xs text-muted-foreground">Attendance</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl bg-sidebar-accent p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</div>
            <div className="mt-1 text-sm font-semibold">{name || "…"}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{role}</div>
            <Button variant="ghost" onClick={signOut} className="mt-3 w-full justify-start rounded-full">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

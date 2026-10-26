import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Upload, FileText, Stethoscope, Pill, LogOut, LayoutDashboard, MessageSquare, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import { IncomingCallOverlay } from "./IncomingCallOverlay";
import { OnboardingModal } from "./OnboardingModal";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export const AppShell = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { totalUnread } = useConversations();
  useSessionTimeout();
  const showOnboarding = !!profile && profile.role === "patient" && !(profile as any).onboarding_completed;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile?.role === "doctor") navigate("/doctor/dashboard");
  }, [user, profile, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return null;

  const nav = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/upload", label: "Upload ECG", icon: Upload },
    { to: "/results/latest", label: "My Results", icon: FileText },
    { to: "/consult", label: "Consult Doctor", icon: Stethoscope },
    { to: "/chat", label: "Messages", icon: MessageSquare, badge: totalUnread },
    { to: "/vitals", label: "Vitals", icon: Heart },
    { to: "/medicines", label: "Medicines", icon: Pill },
  ];

  const initials = (profile?.display_name ?? user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-sidebar/60 backdrop-blur-xl sticky top-0 h-screen">
        <div className="px-6 py-6"><Logo /></div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-white/[0.04] text-foreground before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary before:rounded-r"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {badge && badge > 0 ? (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono grid place-items-center font-bold">
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-gradient-coral grid place-items-center font-mono text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{profile?.display_name ?? user.email}</div>
              <div className="text-xs text-muted-foreground">Patient</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-24 lg:pb-0">
        {/* Top bar with bell */}
        <div className="sticky top-0 z-30 flex justify-end items-center gap-3 px-6 md:px-10 py-4 bg-background/60 backdrop-blur-md border-b border-white/[0.03]">
          <NotificationBell />
        </div>
        <Outlet />
      </main>

      <IncomingCallOverlay />
      {showOnboarding && <OnboardingModal />}

      {/* Mobile bottom nav — all 7 items, evenly distributed */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-white/10 px-1 pt-2 pb-[env(safe-area-inset-bottom)] flex items-stretch justify-between">
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 py-1 rounded-lg text-[9px] leading-tight ${isActive ? "text-primary" : "text-muted-foreground"}`
          }>
            <Icon className="h-[18px] w-[18px]" />
            {badge && badge > 0 ? (
              <span className="absolute top-0 right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-primary text-primary-foreground text-[8px] font-mono grid place-items-center">
                {badge > 9 ? "9+" : badge}
              </span>
            ) : null}
            <span className="truncate max-w-full">{label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

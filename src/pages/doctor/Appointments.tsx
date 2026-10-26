import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, List, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Appt = {
  id: string;
  doctor_name: string;
  specialty: string | null;
  scheduled_at: string;
  status: string;
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am - 7pm

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // Sun
  return x;
};

const Appointments = () => {
  const [items, setItems] = useState<Appt[]>([]);
  const [view, setView] = useState<"week" | "list">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  useEffect(() => {
    supabase
      .from("consultations")
      .select("*")
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => setItems((data as Appt[]) ?? []));
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const apptsByDay = useMemo(() => {
    const map: Record<string, Appt[]> = {};
    days.forEach((d) => (map[d.toDateString()] = []));
    items.forEach((a) => {
      const key = new Date(a.scheduled_at).toDateString();
      if (map[key]) map[key].push(a);
    });
    return map;
  }, [items, days]);

  const shiftWeek = (n: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + n * 7);
    setWeekStart(d);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-2">Schedule</p>
          <h1 className="font-display text-4xl">Appointments</h1>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
          <button onClick={() => setView("week")} className={`px-3 py-1.5 rounded-full text-xs font-mono inline-flex items-center gap-1.5 transition ${view === "week" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}>
            <LayoutGrid className="h-3 w-3" /> Week
          </button>
          <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-full text-xs font-mono inline-flex items-center gap-1.5 transition ${view === "list" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}>
            <List className="h-3 w-3" /> List
          </button>
        </div>
      </div>

      {view === "list" ? (
        items.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No appointments scheduled
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="glass rounded-2xl p-5 flex items-center gap-5">
                <div className="text-center w-14">
                  <div className="font-display text-2xl">{new Date(a.scheduled_at).getDate()}</div>
                  <div className="text-xs font-mono text-muted-foreground uppercase">
                    {new Date(a.scheduled_at).toLocaleString("en-US", { month: "short" })}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{a.doctor_name}</div>
                  <div className="text-xs text-muted-foreground">{a.specialty ?? "General"}</div>
                </div>
                <div className="text-xs font-mono text-secondary">
                  {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-mono ${
                  a.status === "scheduled" ? "bg-secondary/10 text-secondary border border-secondary/30" : "bg-white/5 text-muted-foreground border border-white/10"
                }`}>{a.status}</span>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        <div className="glass rounded-3xl overflow-hidden">
          {/* Week nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <Button variant="ghost" size="sm" onClick={() => shiftWeek(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm font-mono">
              {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
              {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => shiftWeek(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-[800px] grid grid-cols-[60px_repeat(7,1fr)]">
              {/* Header row */}
              <div className="border-b border-r border-white/5 bg-white/[0.02]" />
              {days.map((d) => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={d.toISOString()} className={`p-2 text-center border-b border-r border-white/5 bg-white/[0.02] ${isToday ? "text-secondary" : ""}`}>
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="font-display text-lg">{d.getDate()}</div>
                  </div>
                );
              })}

              {/* Hour rows */}
              {HOURS.map((h) => (
                <div key={h} className="contents">
                  <div className="border-b border-r border-white/5 px-2 py-3 text-[10px] font-mono text-muted-foreground text-right">
                    {h % 12 === 0 ? 12 : h % 12}{h < 12 ? "a" : "p"}
                  </div>
                  {days.map((d) => {
                    const key = d.toDateString();
                    const cellAppts = (apptsByDay[key] ?? []).filter((a) => new Date(a.scheduled_at).getHours() === h);
                    return (
                      <div key={key + h} className="relative border-b border-r border-white/5 min-h-[64px] hover:bg-white/[0.02]">
                        {cellAppts.map((a) => (
                          <motion.div key={a.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-x-1 top-1 bottom-1 rounded-lg bg-secondary/15 border border-secondary/40 p-1.5 overflow-hidden">
                            <div className="text-[10px] font-mono text-secondary">
                              {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-[11px] font-medium truncate leading-tight">{a.doctor_name}</div>
                            {a.specialty && <div className="text-[10px] text-muted-foreground truncate">{a.specialty}</div>}
                          </motion.div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;

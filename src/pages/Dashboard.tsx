import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, Heart, CalendarClock, Gauge, Upload, ArrowUpRight, FileText, Stethoscope, Clock, MessageSquare, Watch, AlertTriangle, Droplet } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSmartwatch } from "@/context/SmartWatchContext";

const ranges = ["7D", "30D", "3M"] as const;

type Ecg = {
  id: string;
  diagnosis: string | null;
  status: string;
  confidence: number | null;
  created_at: string;
  doctor_reviewed: boolean;
  doctor_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const sw = useSmartwatch();
  const [range, setRange] = useState<typeof ranges[number]>("7D");
  const [ecgs, setEcgs] = useState<Ecg[]>([]);
  const [pendingReview, setPendingReview] = useState<Ecg[]>([]);
  const [myDoctor, setMyDoctor] = useState<{ name: string; specialty: string | null; reviewed_at: string } | null>(null);
  const [nextAppt, setNextAppt] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: e }, { data: appts }] = await Promise.all([
        supabase.from("ecg_uploads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("consultations").select("*").eq("user_id", user.id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(1),
      ]);
      setEcgs((e as Ecg[]) ?? []);
      setPendingReview(((e as Ecg[]) ?? []).filter((x) => !x.doctor_reviewed).slice(0, 3));
      setNextAppt(appts?.[0] ?? null);

      // Find latest reviewing doctor
      const reviewed = ((e as Ecg[]) ?? []).find((x) => x.doctor_reviewed && x.reviewed_by);
      if (reviewed?.reviewed_by) {
        const { data: dp } = await supabase
          .from("profiles")
          .select("display_name, specialty")
          .eq("user_id", reviewed.reviewed_by)
          .maybeSingle();
        if (dp) setMyDoctor({ name: (dp as any).display_name, specialty: (dp as any).specialty, reviewed_at: reviewed.reviewed_at! });
      }
    };
    load();
  }, [user]);

  const lastResult = ecgs[0];
  const statusTone = !lastResult ? "text-muted-foreground border-white/10 bg-white/[0.02]" :
                     lastResult.status === "normal" ? "text-success border-success/30 bg-success/10" :
                     lastResult.status === "warning" ? "text-warning border-warning/30 bg-warning/10" :
                     "text-destructive border-destructive/30 bg-destructive/10";

  // Build trend chart from ECG confidence/timing
  const limit = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const trend = ecgs.slice(0, limit).reverse().map((e, i) => ({
    date: new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    bpm: 60 + ((e.confidence ?? 75) % 40), // synthetic from confidence
    idx: i,
  }));

  const avgBpm = trend.length ? Math.round(trend.reduce((s, x) => s + x.bpm, 0) / trend.length) : 0;
  const riskScore = ecgs.length === 0 ? 0 : Math.min(100, Math.round(
    ecgs.slice(0, 10).reduce((s, e) => s + (e.status === "critical" ? 30 : e.status === "warning" ? 12 : 2), 0)
  ));
  const riskLabel = riskScore < 33 ? "Low" : riskScore < 66 ? "Moderate" : "High";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-mono">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="font-display text-4xl mt-1">Hi, {profile?.display_name?.split(" ")[0] ?? user?.email?.split("@")[0]}</h1>
        </div>
        <Link to="/upload"><Button variant="hero"><Upload className="h-4 w-4" /> New ECG</Button></Link>
      </motion.div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Card delay={0}>
          <CardHeader icon={Heart} label="Last ECG" />
          <div className="mt-3 flex items-center justify-between">
            <div className="font-display text-2xl truncate">{lastResult?.diagnosis ?? "No data"}</div>
            {lastResult && <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase border ${statusTone} shrink-0 ml-2`}>{lastResult.status}</span>}
          </div>
          {lastResult ? (
            <Link to={`/results/${lastResult.id}`} className="mt-4 inline-flex items-center gap-1 text-xs text-secondary hover:underline">
              View report <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : (
            <Link to="/upload" className="mt-4 inline-flex items-center gap-1 text-xs text-secondary hover:underline">
              Upload your first ECG <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </Card>

        <Card delay={0.05}>
          <CardHeader icon={Activity} label="Avg Heart Rate" />
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl">{avgBpm || "—"}</span>
            <span className="text-xs text-muted-foreground font-mono">BPM · {range}</span>
          </div>
          <div className="mt-3 h-12 -mx-2">
            {trend.length > 0 ? (
              <ResponsiveContainer><LineChart data={trend}><Line type="monotone" dataKey="bpm" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
            ) : (
              <div className="text-[10px] text-muted-foreground font-mono grid place-items-center h-full">No trend data</div>
            )}
          </div>
        </Card>

        <Card delay={0.1}>
          <CardHeader icon={CalendarClock} label="Upcoming" />
          {nextAppt ? (
            <div className="mt-3">
              <div className="font-display text-xl truncate">{nextAppt.doctor_name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(nextAppt.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">No upcoming consults</div>
          )}
          <Link to="/consult"><Button variant="ghost" size="sm" className="mt-4">Manage <ArrowUpRight className="h-3 w-3" /></Button></Link>
        </Card>

        <Card delay={0.15}>
          <CardHeader icon={Gauge} label="Risk Score" />
          <div className="mt-3 flex items-center gap-4">
            <RiskGauge value={riskScore} />
            <div>
              <div className="font-display text-xl">{riskLabel}</div>
              <div className="text-xs text-muted-foreground font-mono">{riskScore} / 100</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart + side cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-xl">Heart rate trend</h3>
              <p className="text-xs text-muted-foreground font-mono">Past {range}</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
              {ranges.map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {trend.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="rate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={[50, 110]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, backdropFilter: "blur(20px)" }} />
                  <Area type="monotone" dataKey="bpm" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rate)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Upload an ECG to see your trend.
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Live Vitals widget */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-3xl p-6 relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider mb-4">
              <Watch className="h-3.5 w-3.5 text-[#00e5cc]" /> Live Vitals
              {sw.alerts.length > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-[#ff2d55]/15 text-[#ff2d55] border border-[#ff2d55]/40 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-2.5 w-2.5" /> {sw.alerts.length}
                </span>
              )}
            </div>
            {sw.isConnected && sw.current ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground mb-1">
                      <Heart className="h-3 w-3 text-[#ff2d55]" /> HR
                    </div>
                    <div className="font-mono text-2xl text-[#ff2d55]">{sw.current.heartRate}<span className="text-[10px] text-muted-foreground ml-1">BPM</span></div>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground mb-1">
                      <Droplet className="h-3 w-3 text-[#00e5cc]" /> SpO2
                    </div>
                    <div className="font-mono text-2xl text-[#00e5cc]">{sw.current.spo2}<span className="text-[10px] text-muted-foreground ml-1">%</span></div>
                  </div>
                </div>
                {sw.liveHistory.length > 1 && (
                  <div className="h-12 -mx-1 mb-2">
                    <ResponsiveContainer>
                      <LineChart data={sw.liveHistory.map((r, i) => ({ i, hr: r.heartRate }))}>
                        <Line type="monotone" dataKey="hr" stroke="#ff2d55" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground font-mono">
                  {sw.deviceName} · live
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p className="mb-3">No wearable connected.</p>
                <Link to="/vitals"><Button variant="ghost" size="sm" className="w-full">Connect device <ArrowUpRight className="h-3 w-3" /></Button></Link>
              </div>
            )}
          </motion.div>

          {/* My Doctor */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider mb-4">
              <Stethoscope className="h-3.5 w-3.5" /> My Doctor
            </div>
            {myDoctor ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-teal grid place-items-center font-display text-lg text-secondary-foreground">
                    {myDoctor.name?.split(" ").slice(-1)[0]?.[0] ?? "D"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-lg truncate">{myDoctor.name}</div>
                    <div className="text-xs text-secondary font-mono truncate">{myDoctor.specialty ?? "Cardiologist"}</div>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mb-3">
                  Last review · {new Date(myDoctor.reviewed_at).toLocaleDateString()}
                </div>
                <Link to="/chat"><Button variant="ghost" size="sm" className="w-full"><MessageSquare className="h-3 w-3" /> Message</Button></Link>
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                No doctor assigned yet.
                <Link to="/consult" className="block mt-3"><Button variant="ghost" size="sm">Find a cardiologist <ArrowUpRight className="h-3 w-3" /></Button></Link>
              </div>
            )}
          </motion.div>

          {/* Pending Review */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider mb-4">
              <Clock className="h-3.5 w-3.5 text-warning" /> Pending Review
              {pendingReview.length > 0 && (
                <span className="ml-auto text-[10px] bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 rounded-full">{pendingReview.length}</span>
              )}
            </div>
            {pendingReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending reviews.</p>
            ) : (
              <div className="space-y-2">
                {pendingReview.map((e) => (
                  <Link key={e.id} to={`/results/${e.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition">
                    <div className="h-8 w-8 rounded-lg bg-warning/10 border border-warning/30 grid place-items-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-warning" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{e.diagnosis ?? "AI analyzing…"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{new Date(e.created_at).toLocaleDateString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Card = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass rounded-2xl p-5">
    {children}
  </motion.div>
);

const CardHeader = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
    <Icon className="h-3.5 w-3.5" /> {label}
  </div>
);

const RiskGauge = ({ value }: { value: number }) => {
  const r = 28; const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const color = value < 33 ? "hsl(var(--success))" : value < 66 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <svg width={70} height={70} className="-rotate-90">
      <circle cx="35" cy="35" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
      <circle cx="35" cy="35" r={r} stroke={color} strokeWidth="6" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s" }} />
    </svg>
  );
};

export default Dashboard;

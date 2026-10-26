import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bluetooth, Activity, Heart, Droplet, Footprints, AlertTriangle, X, Phone, History } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis, XAxis, AreaChart, Area, CartesianGrid, Tooltip } from "recharts";
import { useSmartwatch } from "@/context/SmartWatchContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Vitals = () => {
  const sw = useSmartwatch();
  const [name, setName] = useState(sw.threshold.emergency_contact_name ?? "");
  const [phone, setPhone] = useState(sw.threshold.emergency_contact_phone ?? "");
  const [maxHr, setMaxHr] = useState(sw.threshold.max_heart_rate);
  const [minHr, setMinHr] = useState(sw.threshold.min_heart_rate);
  const [minSpo2, setMinSpo2] = useState(sw.threshold.min_spo2);

  useEffect(() => {
    setName(sw.threshold.emergency_contact_name ?? "");
    setPhone(sw.threshold.emergency_contact_phone ?? "");
    setMaxHr(sw.threshold.max_heart_rate);
    setMinHr(sw.threshold.min_heart_rate);
    setMinSpo2(sw.threshold.min_spo2);
  }, [sw.threshold]);

  const chartData = sw.liveHistory.map((r, i) => ({ i, hr: r.heartRate }));
  const beatDuration = sw.current ? 60 / Math.max(40, sw.current.heartRate) : 1;

  const sosLink = phone
    ? `sms:${phone.replace(/\s+/g, "")}?body=${encodeURIComponent("Emergency: HeartIQ detected critical vitals. Please check on me.")}`
    : "#";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <p className="text-xs text-[#00e5cc] font-mono tracking-widest uppercase mb-2">Live monitoring</p>
        <h1 className="font-display font-bold text-4xl text-white">Vitals</h1>
      </div>

      {/* Connection panel */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        {!sw.isConnected ? (
          <>
            <h2 className="font-display font-bold text-xl text-white mb-4">Connect your device</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <ConnectCard
                icon={Bluetooth} color="text-[#00e5cc]"
                title="Bluetooth Wearable"
                desc="WearOS, Fitbit, Garmin, BLE heart rate monitors"
                btnLabel={sw.isConnecting ? "Connecting…" : "Connect via Bluetooth"}
                onClick={sw.connectBluetooth}
                hint="Not supported on iOS Safari"
              />
              <ConnectCard
                icon={Activity} color="text-purple-400"
                title="Simulated Device"
                desc="Demo mode with realistic simulated data"
                btnLabel="Start Simulation"
                onClick={sw.startSimulation}
              />
              <ConnectCard
                icon={Heart} color="text-white"
                title="Apple Health / Google Fit"
                desc="Import historical heart-rate CSV export"
                btnLabel="Upload CSV"
                onClick={() => document.getElementById("hf-csv")?.click()}
              />
              <ConnectCard
                icon={Footprints} color="text-amber-400"
                title="Manual Entry"
                desc="Log a single reading"
                btnLabel="Add reading"
                onClick={() => {
                  const hr = parseInt(prompt("Heart rate (BPM)?") ?? "0", 10);
                  if (hr > 0) sw.saveManualReading({ heartRate: hr });
                }}
              />
            </div>
            <input id="hf-csv" type="file" accept=".csv" hidden
              onChange={(e) => e.target.files?.[0] && sw.importHealthCsv(e.target.files[0], "google_fit")} />
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-green-500/40 animate-ping" />
              <span className="relative block h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium">{sw.deviceName}</div>
              <div className="text-xs text-white/60 font-mono">Connected · Live · {sw.connectionType}</div>
            </div>
            <Button variant="outline" size="sm" onClick={sw.disconnect}
              className="border-white/20 bg-transparent hover:bg-white/10 text-white rounded-xl">
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {/* Live dashboard */}
      {sw.isConnected && sw.current && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Heart Rate" value={sw.current.heartRate} unit="BPM" color="text-[#ff2d55]"
              icon={
                <Heart className="h-5 w-5 text-[#ff2d55]" style={{ animation: `heartbeat ${beatDuration}s ease-in-out infinite` }} />
              } />
            <MetricCard label="SpO2" value={sw.current.spo2} unit="%" color="text-[#00e5cc]" icon={<Droplet className="h-5 w-5 text-[#00e5cc]" />} />
            <MetricCard label="Steps" value={sw.current.steps} unit="today" color="text-white" icon={<Footprints className="h-5 w-5 text-white" />}
              progress={Math.min(100, (sw.current.steps / 10000) * 100)} />
            <MetricCard label="HRV" value={sw.current.hrv} unit="ms" color="text-amber-400" icon={<Activity className="h-5 w-5 text-amber-400" />} />
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <div className="text-xs font-mono uppercase text-white/60 mb-3">Live Heart Rate · last 2 minutes</div>
            <div className="h-32">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <XAxis dataKey="i" hide />
                  <YAxis domain={["dataMin - 10", "dataMax + 10"]} hide />
                  <ReferenceLine y={sw.threshold.max_heart_rate} stroke="#fbbf24" strokeDasharray="4 4" />
                  <ReferenceLine y={sw.threshold.min_heart_rate} stroke="#00e5cc" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="hr" stroke="#ff2d55" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Alerts */}
      {sw.alerts.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#ff2d55]" /> Active Alerts
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff2d55] text-white font-mono">{sw.alerts.length}</span>
            </h3>
          </div>
          <div className="space-y-2">
            {sw.alerts.map((a) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border-l-4 border-[#ff2d55]">
                <AlertTriangle className="h-4 w-4 text-[#ff2d55] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{a.title}</div>
                  <div className="text-xs text-white/60">{a.description}</div>
                </div>
                <button onClick={() => sw.dismissAlert(a.id)} className="text-white/60 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
          {sw.alerts.some((a) => a.severity === "critical") && phone && (
            <a href={sosLink} className="mt-4 block">
              <Button className="w-full bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white rounded-xl">
                <Phone className="h-4 w-4 mr-2" /> Emergency SOS — Alert {name || "contact"}
              </Button>
            </a>
          )}
        </div>
      )}

      {/* Threshold settings */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="font-display font-bold text-lg text-white mb-4">Alert Thresholds</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={`Max Heart Rate: ${maxHr} BPM`}>
            <input type="range" min={80} max={180} value={maxHr} onChange={(e) => setMaxHr(+e.target.value)} className="w-full accent-[#ff2d55]" />
          </Field>
          <Field label={`Min Heart Rate: ${minHr} BPM`}>
            <input type="range" min={30} max={70} value={minHr} onChange={(e) => setMinHr(+e.target.value)} className="w-full accent-[#00e5cc]" />
          </Field>
          <Field label={`Min SpO2: ${minSpo2}%`}>
            <input type="range" min={85} max={98} value={minSpo2} onChange={(e) => setMinSpo2(+e.target.value)} className="w-full accent-[#00e5cc]" />
          </Field>
          <Field label="Emergency contact name">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl" />
          </Field>
          <Field label="Emergency contact phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1…" className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl" />
          </Field>
        </div>
        <Button
          className="mt-4 bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white rounded-xl"
          onClick={() =>
            sw.saveThreshold({
              max_heart_rate: maxHr,
              min_heart_rate: minHr,
              min_spo2: minSpo2,
              emergency_contact_name: name || null,
              emergency_contact_phone: phone || null,
              alerts_enabled: true,
            })
          }
        >
          Save thresholds
        </Button>
      </div>
      <VitalsHistory />
    </motion.div>
  );
};

const VitalsHistory = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const days = range === "7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    supabase
      .from("vitals_readings")
      .select("heart_rate, spo2, steps, is_anomaly, recorded_at")
      .eq("user_id", user.id)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true })
      .limit(1000)
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [user, range]);

  const stats = useMemo(() => {
    const hr = rows.map((r) => r.heart_rate).filter((n): n is number => typeof n === "number");
    const spo = rows.map((r) => r.spo2).filter((n): n is number => typeof n === "number");
    const steps = rows.map((r) => r.steps).filter((n): n is number => typeof n === "number");
    return {
      avgHr: hr.length ? Math.round(hr.reduce((s, x) => s + x, 0) / hr.length) : 0,
      minHr: hr.length ? Math.min(...hr) : 0,
      maxHr: hr.length ? Math.max(...hr) : 0,
      avgSpo: spo.length ? Math.round(spo.reduce((s, x) => s + x, 0) / spo.length) : 0,
      totalSteps: steps.length ? Math.max(...steps) - Math.min(...steps) : 0,
      anomalies: rows.filter((r) => r.is_anomaly).length,
    };
  }, [rows]);

  const chartData = rows.map((r) => ({
    t: new Date(r.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    hr: r.heart_rate,
  }));

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <History className="h-4 w-4 text-[#00e5cc]" /> History
        </h3>
        <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
          <TabsList className="bg-white/10 border border-white/10">
            <TabsTrigger value="7d" className="data-[state=active]:bg-[#ff2d55] data-[state=active]:text-white text-xs">7D</TabsTrigger>
            <TabsTrigger value="30d" className="data-[state=active]:bg-[#ff2d55] data-[state=active]:text-white text-xs">30D</TabsTrigger>
          </TabsList>
          <TabsContent value="7d" />
          <TabsContent value="30d" />
        </Tabs>
      </div>
      {loading ? (
        <div className="text-sm text-white/50 py-10 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-white/50 py-10 text-center">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No readings yet. Keep your watch connected to build history.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <Stat label="Avg HR" value={`${stats.avgHr}`} unit="BPM" color="text-[#ff2d55]" />
            <Stat label="Min / Max HR" value={`${stats.minHr} / ${stats.maxHr}`} unit="BPM" color="text-white" />
            <Stat label="Avg SpO2" value={`${stats.avgSpo}`} unit="%" color="text-[#00e5cc]" />
            <Stat label="Steps" value={`${stats.totalSteps.toLocaleString()}`} unit="total" color="text-white" />
            <Stat label="Anomalies" value={`${stats.anomalies}`} unit="events" color="text-amber-400" />
            <Stat label="Readings" value={`${rows.length}`} unit="logged" color="text-white/70" />
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="vh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff2d55" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ff2d55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="t" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#050d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="hr" stroke="#ff2d55" strokeWidth={2} fill="url(#vh)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) => (
  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
    <div className="text-[10px] font-mono uppercase text-white/50 mb-1">{label}</div>
    <div className={`font-mono text-xl font-bold ${color}`}>{value}</div>
    <div className="text-[10px] text-white/40">{unit}</div>
  </div>
);

const ConnectCard = ({ icon: Icon, color, title, desc, btnLabel, onClick, hint }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-white/20 transition">
    <Icon className={`h-6 w-6 ${color} mb-3`} />
    <div className="text-white font-medium">{title}</div>
    <div className="text-xs text-white/60 mt-1 mb-3">{desc}</div>
    <Button onClick={onClick} className="w-full bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white rounded-xl">{btnLabel}</Button>
    {hint && <div className="text-[10px] text-white/40 mt-2 font-mono">{hint}</div>}
  </div>
);

const MetricCard = ({ label, value, unit, color, icon, progress }: any) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-mono uppercase text-white/60">{label}</div>
      {icon}
    </div>
    <div className={`font-mono text-4xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-white/60 mt-1">{unit}</div>
    {progress != null && (
      <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-[#00e5cc]" style={{ width: `${progress}%` }} />
      </div>
    )}
  </div>
);

const Field = ({ label, children }: any) => (
  <div>
    <Label className="text-xs text-white/60 mb-2 block">{label}</Label>
    {children}
  </div>
);

export default Vitals;

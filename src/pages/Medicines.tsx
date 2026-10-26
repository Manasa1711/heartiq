import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Pill, AlertTriangle, Ban, Ruler, Repeat, CheckCircle2, RefreshCw, Shield, Baby, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRateLimit } from "@/hooks/useRateLimit";
import { toast } from "sonner";

type Interaction = { drug: string; severity: "Low" | "Medium" | "High"; effect: string };
type MedInfo = {
  name: string;
  category: string;
  description: string;
  uses: string[];
  sideEffects: string[];
  dosage: { adult: string; child: string; elderly: string };
  warnings: string[];
  contraindications: string[];
  interactions: Interaction[];
  alternatives: string[];
  storageInstructions: string;
  pregnancySafety: string;
};

const HISTORY_KEY = "heartiq:med-history";

const Medicines = () => {
  const { user } = useAuth();
  const rl = useRateLimit(`medicines:${user?.id ?? "anon"}`, 30, "hour");
  const [q, setQ] = useState("");
  const [info, setInfo] = useState<MedInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showAllSE, setShowAllSE] = useState(false);
  const [limitInfo, setLimitInfo] = useState(rl.peek());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const pushHistory = (name: string) => {
    setHistory((prev) => {
      const next = [name, ...prev.filter((x) => x.toLowerCase() !== name.toLowerCase())].slice(0, 5);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const lookup = async (name: string) => {
    if (!name.trim()) return;
    const gate = rl.check();
    setLimitInfo(rl.peek());
    if (!gate.allowed) {
      const msg = `Hourly lookup limit reached (30/hr). Try again in ${rl.formatReset(gate.resetAt)}.`;
      setError(msg);
      toast.error(msg);
      return;
    }
    setQ(name); setInfo(null); setError(null); setLoading(true); setShowAllSE(false);
    try {
      const { data, error } = await supabase.functions.invoke("groq-medicine", { body: { medicineName: name } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setInfo(data as MedInfo);
      pushHistory(name);
    } catch (e: any) {
      setError(e.message ?? "Could not load medicine info");
      toast.error("Couldn't fetch info");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-3">Medicine AI</p>
        <h1 className="font-display text-4xl md:text-5xl">Understand any cardiac medicine.</h1>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup(q)}
          placeholder="Search any medicine… e.g. Metoprolol"
          className="pl-12 h-16 text-lg bg-input/40 rounded-2xl"
        />
      </div>
      {limitInfo.remaining <= 10 && (
        <div className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <Clock className="h-3 w-3" /> {limitInfo.remaining} of 30 lookups left this hour
          {limitInfo.remaining === 0 && limitInfo.resetAt && <span>· resets in {rl.formatReset(limitInfo.resetAt)}</span>}
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          <span className="text-xs text-muted-foreground font-mono mr-1 self-center">Recent:</span>
          {history.map((h) => (
            <button key={h} onClick={() => lookup(h)}
              className="px-3 py-1 rounded-full text-xs bg-white/[0.04] border border-white/10 hover:border-secondary/40 hover:text-secondary transition">
              {h}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Skeleton className="h-32 rounded-3xl bg-white/[0.03]" />
            <div className="grid sm:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-3xl bg-white/[0.03]" />)}
            </div>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 border border-destructive/30 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <h3 className="font-display text-xl mb-2">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="hero" onClick={() => lookup(q)}><RefreshCw className="h-4 w-4" /> Retry</Button>
          </motion.div>
        )}

        {info && !loading && (
          <motion.div key={info.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }} className="space-y-6">
            <div className="glass rounded-3xl p-8">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="font-display text-3xl">{info.name}</h2>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs bg-secondary/10 border border-secondary/30 text-secondary font-mono">{info.category}</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/10 border border-primary/30 text-primary font-mono flex items-center gap-1 h-fit">
                  <Sparkles className="h-3 w-3" /> AI generated
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{info.description}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card icon={CheckCircle2} title="Uses" tone="text-secondary">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {info.uses?.map((u, i) => <li key={i} className="flex gap-2"><span className="text-secondary">▸</span>{u}</li>)}
                </ul>
              </Card>

              <Card icon={AlertTriangle} title="Side Effects" tone="text-primary">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {(showAllSE ? info.sideEffects : info.sideEffects?.slice(0, 4))?.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="text-primary">•</span>{s}</li>
                  ))}
                </ul>
                {info.sideEffects?.length > 4 && (
                  <button onClick={() => setShowAllSE(v => !v)} className="text-xs text-secondary hover:underline mt-3">
                    {showAllSE ? "Show less" : `Show all (${info.sideEffects.length})`}
                  </button>
                )}
              </Card>

              <Card icon={Ruler} title="Dosage" tone="text-blue-400">
                <div className="space-y-2 text-sm">
                  <DoseRow label="Adult" value={info.dosage?.adult} />
                  <DoseRow label="Child" value={info.dosage?.child} />
                  <DoseRow label="Elderly" value={info.dosage?.elderly} />
                </div>
              </Card>

              <Card icon={Ban} title="Warnings & Contraindications" tone="text-warning">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {[...(info.warnings ?? []), ...(info.contraindications ?? [])].map((w, i) => (
                    <li key={i} className="flex gap-2"><span className="text-warning">⚠</span>{w}</li>
                  ))}
                </ul>
              </Card>
            </div>

            {info.interactions?.length > 0 && (
              <div className="glass rounded-3xl p-6">
                <h3 className="font-display text-lg mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-secondary" /> Drug Interactions</h3>
                <div className="overflow-hidden rounded-xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead className="bg-white/[0.03] text-xs font-mono uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Drug</th>
                        <th className="text-left p-3">Severity</th>
                        <th className="text-left p-3">Effect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info.interactions.map((it, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="p-3 font-medium">{it.drug}</td>
                          <td className="p-3"><SeverityBadge severity={it.severity} /></td>
                          <td className="p-3 text-muted-foreground">{it.effect}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {info.alternatives?.length > 0 && (
              <Card icon={Repeat} title="Alternatives" tone="text-secondary">
                <div className="flex flex-wrap gap-2">
                  {info.alternatives.map(a => (
                    <button key={a} onClick={() => lookup(a)}
                      className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 hover:border-secondary/40 hover:text-secondary transition">
                      {a}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Card icon={Pill} title="Storage" tone="text-muted-foreground">
                <p className="text-sm text-muted-foreground">{info.storageInstructions}</p>
              </Card>
              <Card icon={Baby} title="Pregnancy Safety" tone="text-muted-foreground">
                <p className="text-sm text-muted-foreground">{info.pregnancySafety}</p>
              </Card>
            </div>
          </motion.div>
        )}

        {!info && !loading && !error && (
          <div className="text-center text-muted-foreground/60 text-sm font-mono">Try: Metoprolol · Apixaban · Atorvastatin</div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Card = ({ icon: Icon, title, tone, children }: any) => (
  <div className="glass rounded-3xl p-6 hover:border-white/20 transition">
    <div className={`flex items-center gap-2 font-display text-base mb-3 ${tone}`}>
      <Icon className="h-4 w-4" /> {title}
    </div>
    {children}
  </div>
);

const DoseRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
    <span className="text-xs font-mono uppercase text-muted-foreground w-16 shrink-0 mt-0.5">{label}</span>
    <span className="text-sm text-foreground/90">{value ?? "—"}</span>
  </div>
);

const SeverityBadge = ({ severity }: { severity: "Low" | "Medium" | "High" }) => {
  const cfg = severity === "High"
    ? "bg-destructive/15 border-destructive/30 text-destructive"
    : severity === "Medium"
    ? "bg-warning/15 border-warning/30 text-warning"
    : "bg-success/15 border-success/30 text-success";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${cfg}`}>{severity}</span>;
};

export default Medicines;

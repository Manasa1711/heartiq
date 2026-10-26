import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown, ChevronUp, MessageSquare, Sparkles, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const CLASSES = ["Normal", "Arrhythmia", "Myocardial Infarction", "ST Depression"];
const CLASS_COLORS: Record<string, string> = {
  "Normal": "hsl(var(--secondary))",
  "Arrhythmia": "hsl(var(--primary))",
  "Myocardial Infarction": "hsl(var(--warning))",
  "ST Depression": "hsl(280 80% 65%)",
};

const Results = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [conf, setConf] = useState(0);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const exportPdf = async () => {
    if (!reportRef.current || !result || !user) return;
    setExporting(true);
    const t = toast.loading("Generating PDF…");
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#050d1a",
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 16;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 8;
      pdf.addImage(imgData, "JPEG", 8, position, imgW, imgH);
      heightLeft -= pageH - 16;
      while (heightLeft > 0) {
        pdf.addPage();
        position = -(imgH - heightLeft) + 8;
        pdf.addImage(imgData, "JPEG", 8, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`HeartIQ_Report_${result.id.slice(0, 8)}.pdf`);
      void logAudit(user.id, "ecg_pdf_exported", "ecg_uploads", result.id);
      toast.success("PDF downloaded", { id: t });
    } catch (e: any) {
      toast.error(e.message ?? "PDF export failed", { id: t });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      let q = supabase.from("ecg_uploads").select("*").eq("user_id", user.id);
      const { data, error } = id === "latest"
        ? await q.order("created_at", { ascending: false }).limit(1).maybeSingle()
        : await q.eq("id", id!).maybeSingle();
      if (error || !data) { setLoading(false); return; }
      setResult(data);
      setLoading(false);
      setTimeout(() => setConf((data as any).confidence ?? 0), 200);
    };
    load();
  }, [id, user]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading report…</div>;
  }
  if (!result) {
    return (
      <div className="min-h-screen grid place-items-center text-center p-8">
        <div>
          <h2 className="font-display text-2xl mb-3">No reports yet</h2>
          <p className="text-muted-foreground mb-6">Upload an ECG to see results here.</p>
          <Button variant="hero" onClick={() => navigate("/upload")}>Upload now</Button>
        </div>
      </div>
    );
  }

  const probs = result.findings?.class_probabilities ?? {};
  const winner = result.diagnosis;
  const tone = result.status === "normal" ? "text-secondary border-secondary/30"
             : result.status === "warning" ? "text-warning border-warning/30"
             : "text-destructive border-destructive/30";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs text-muted-foreground font-mono">RESULT · {result.id.slice(0, 8).toUpperCase()} · {new Date(result.created_at).toLocaleDateString()}</p>
        <h1 className="font-display text-4xl mt-1">ECG Analysis</h1>
      </motion.div>

      {/* Doctor review banner */}
      {result.doctor_reviewed && result.doctor_notes && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 glass rounded-3xl p-5 border border-primary/30 flex items-start gap-4">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="font-display text-lg mb-1">Your doctor has reviewed this ECG</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.doctor_notes}</p>
            {result.doctor_diagnosis_override && (
              <p className="text-xs text-primary font-mono mt-2">Updated diagnosis: {result.doctor_diagnosis_override}</p>
            )}
          </div>
        </motion.div>
      )}
      {!result.doctor_reviewed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-6 rounded-2xl p-4 border border-secondary/30 bg-secondary/5 text-sm text-secondary flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
          Your ECG is in the doctor review queue. You'll be notified when reviewed.
        </motion.div>
      )}

      <div ref={reportRef} className="grid lg:grid-cols-5 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6">
          {result.image_url && (
            <div className="glass rounded-3xl p-6">
              <h3 className="font-display text-lg mb-4">ECG Image</h3>
              <div className="rounded-2xl border border-white/5 bg-surface-1/50 p-3 overflow-hidden">
                <img src={result.image_url} alt="ECG" crossOrigin="anonymous" className="w-full rounded-xl" />
              </div>
            </div>
          )}

          {/* Class probability breakdown */}
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-lg mb-1">Class Probability Breakdown</h3>
            <p className="text-xs text-muted-foreground font-mono mb-5">ConvNeXt-Base · 4-class classifier</p>
            <div className="space-y-4">
              {CLASSES.map((cls) => {
                const raw = probs[cls] ?? 0;
                const pct = Math.round(raw * 100);
                const isWinner = cls === winner;
                return (
                  <div key={cls}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className={`${isWinner ? "font-medium" : "text-muted-foreground"}`}>{cls}</span>
                      <span className="font-mono text-xs">{pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: CLASS_COLORS[cls],
                          boxShadow: isWinner ? `0 0 14px ${CLASS_COLORS[cls]}` : "none",
                          opacity: isWinner ? 1 : 0.7,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-5">
          <div className={`glass rounded-3xl p-6 border ${tone}`}>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Diagnosis</p>
            <h2 className={`font-display text-2xl mb-5 ${tone.split(" ")[0]}`}>{result.diagnosis?.toUpperCase()}</h2>
            <div className="flex items-center gap-5">
              <ConfidenceRing value={conf} />
              <div>
                <div className="text-xs text-muted-foreground font-mono uppercase">Confidence</div>
                <div className="font-mono text-3xl">{conf}%</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-lg mb-3">In plain English</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation ?? "Your ECG has been analyzed."}</p>
          </div>

          {result.findings?.processing_time_ms && (
            <div className="glass rounded-3xl p-6">
              <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
                <h3 className="font-display text-lg">Technical details</h3>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {open && (
                <div className="mt-4 space-y-2 text-sm">
                  <Row label="Model" value="ConvNeXt-Base" />
                  <Row label="Inference time" value={`${result.findings.processing_time_ms} ms`} />
                  <Row label="Classes" value="4" />
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <Link to="/consult"><Button variant="hero" className="w-full"><MessageSquare className="h-4 w-4" /> Consult</Button></Link>
        <Button variant="ghost" onClick={() => result.image_url && window.open(result.image_url)}>
          <Download className="h-4 w-4" /> Image
        </Button>
        <Button variant="ghost" disabled={exporting} onClick={exportPdf}>
          <FileDown className="h-4 w-4" /> {exporting ? "Generating…" : "Download PDF"}
        </Button>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono text-xs">{value}</span>
  </div>
);

const ConfidenceRing = ({ value }: { value: number }) => {
  const r = 38; const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width="100" height="100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
      <circle cx="50" cy="50" r={r} stroke="hsl(var(--secondary))" strokeWidth="6" fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)", filter: "drop-shadow(0 0 8px hsl(var(--secondary) / 0.6))" }} />
    </svg>
  );
};

export default Results;

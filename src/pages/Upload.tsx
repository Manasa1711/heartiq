import { useState, useRef, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileCheck2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NeuralLoader } from "@/components/NeuralLoader";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRateLimit } from "@/hooks/useRateLimit";
import { ecgUploadsTodayCount } from "@/lib/rateLimit";
import { toast } from "sonner";

const stages = [
  "Validating image…",
  "Uploading to secure storage…",
  "ConvNeXt AI is analyzing your ECG…",
  "Cross-checking class probabilities…",
  "Saving report…",
];

const UploadPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const rl = useRateLimit(`ecg-upload:${user?.id ?? "anon"}`, 10, "day");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File) => {
    if (!["image/png", "image/jpeg", "image/jpg"].includes(f.type)) {
      toast.error("Only PNG or JPG images supported");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB");
      return;
    }
    setFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  };

  const submit = async () => {
    if (!file || !user) return;

    // Server-side daily count (prevents localStorage bypass)
    const todayCount = await ecgUploadsTodayCount(user.id);
    if (todayCount >= 10) {
      toast.error("Daily limit reached", { description: "Max 10 ECG uploads per day. Try again tomorrow." });
      return;
    }
    // Client-side throttle (additional)
    const gate = rl.check();
    if (!gate.allowed) {
      toast.error("Upload limit reached", { description: `Try again in ${rl.formatReset(gate.resetAt)}.` });
      return;
    }

    setAnalyzing(true); setStage(0);

    try {
      // Stage 1: validate (already done)
      await new Promise(r => setTimeout(r, 400));

      // Stage 2: upload to storage
      setStage(1);
      const path = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("ecg_uploads").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("ecg_uploads").getPublicUrl(path);
      const imageUrl = pub.publicUrl;

      // Stage 3: call model
      setStage(2);
      const { data: pred, error: pErr } = await supabase.functions.invoke("ecg-predict", { body: { imageUrl } });
      if (pErr) throw pErr;
      if ((pred as any)?.error) throw new Error((pred as any).error);

      // Stage 4
      setStage(3);
      await new Promise(r => setTimeout(r, 400));

      // Stage 5: save to db
      setStage(4);
      const diagnosis = (pred as any).prediction ?? "Unknown";
      const confidence = Math.round(((pred as any).confidence ?? 0) * 100);
      const status = diagnosis.toLowerCase().includes("normal") ? "normal"
                   : diagnosis.toLowerCase().includes("infarct") ? "critical" : "warning";

      const { data: inserted, error: dbErr } = await supabase
        .from("ecg_uploads")
        .insert({
          user_id: user.id,
          file_name: file.name,
          image_url: imageUrl,
          diagnosis,
          confidence,
          status,
          findings: pred as any,
          explanation: `AI model classified this ECG as "${diagnosis}" with ${confidence}% confidence.`,
        })
        .select("id")
        .single();
      if (dbErr) throw dbErr;

      navigate(`/results/${(inserted as any).id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Analysis failed");
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12 grid place-items-center relative">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-3">Upload ECG</p>
          <h1 className="font-display text-4xl md:text-5xl">Drop your ECG. Get answers.</h1>
          <p className="text-muted-foreground mt-3">PNG or JPG image, up to 10 MB.</p>
        </div>

        {!file ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed cursor-pointer p-16 text-center transition-all
              ${drag ? "border-primary bg-primary/5 scale-[1.01]" : "border-primary/40 hover:border-primary/60 hover:bg-white/[0.02]"}`}>
            <motion.div animate={drag ? { y: -6 } : { y: 0 }} className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center mb-6">
              <UploadCloud className="h-9 w-9 text-primary" />
            </motion.div>
            <h3 className="font-display text-2xl mb-2">Drag & drop your ECG image</h3>
            <p className="text-muted-foreground text-sm mb-4">or click to browse</p>
            <p className="text-xs text-muted-foreground/60 font-mono">.PNG · .JPG (max 10 MB)</p>
            <input ref={inputRef} type="file" hidden accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-secondary/10 border border-secondary/30 grid place-items-center">
                <FileCheck2 className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{(file.size / 1024).toFixed(1)} KB · Image detected ✓</div>
              </div>
              <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-full bg-gradient-coral animate-shimmer" />
            </div>
            <Button variant="hero" size="lg" className="w-full mt-6" onClick={submit}>Analyze with AI</Button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {analyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/95 backdrop-blur-xl">
            <div className="text-center">
              <div className="relative mx-auto w-60 h-60 mb-8">
                <NeuralLoader size={240} />
                <div className="absolute inset-0 grid place-items-center">
                  <Logo size="lg" />
                </div>
              </div>
              <h2 className="font-display text-2xl mb-2">ConvNeXt AI is analyzing your ECG…</h2>
              <p className="text-xs text-muted-foreground font-mono mb-3">Checking for: Normal · Arrhythmia · MI · ST Depression</p>
              <motion.p key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-secondary font-mono text-sm">
                {stages[stage]}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadPage;

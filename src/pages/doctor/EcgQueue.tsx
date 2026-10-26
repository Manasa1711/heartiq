import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EcgQueue = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [override, setOverride] = useState("");

  const refresh = async () => {
    const { data } = await supabase.from("ecg_uploads").select("*").eq("doctor_reviewed", false).order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { refresh(); }, []);

  const markReviewed = async () => {
    if (!active || !user) return;
    const { error } = await supabase.from("ecg_uploads").update({
      doctor_reviewed: true,
      doctor_notes: notes || null,
      doctor_diagnosis_override: override || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", active.id);
    if (error) { toast.error("Failed"); return; }
    await supabase.from("notifications").insert({
      user_id: active.user_id, type: "ecg_reviewed",
      title: "Your ECG was reviewed", body: notes ? notes.slice(0, 80) : "Tap to view notes",
      related_id: active.id,
    });
    toast.success("Marked as reviewed");
    setActive(null); setNotes(""); setOverride(""); refresh();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-2">Queue</p>
        <h1 className="font-display text-4xl">ECG Reviews</h1>
        <p className="text-muted-foreground text-sm mt-2">{items.length} pending</p>
      </div>

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <FileSearch className="h-10 w-10 mx-auto mb-3 opacity-30" />
          All caught up.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <motion.button key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => { setActive(it); setNotes(it.doctor_notes ?? ""); setOverride(""); }}
              className="glass rounded-2xl p-5 text-left hover:border-secondary/30 transition">
              <div className="text-xs font-mono text-muted-foreground mb-2">{new Date(it.created_at).toLocaleString()}</div>
              <div className="font-display text-lg mb-1">{it.diagnosis ?? "Pending"}</div>
              {it.confidence && <div className="text-xs text-secondary font-mono">{it.confidence}% confidence</div>}
              {it.image_url && <img src={it.image_url} alt="ECG" className="mt-3 rounded-lg w-full h-32 object-cover" />}
            </motion.button>
          ))}
        </div>
      )}

      {active && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl">ECG Review</h2>
              <button onClick={() => setActive(null)} className="h-10 w-10 rounded-xl glass grid place-items-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass rounded-3xl p-6">
                {active.image_url ? (
                  <img src={active.image_url} alt="ECG" className="w-full rounded-xl" />
                ) : <div className="text-muted-foreground text-sm">No image</div>}
              </div>
              <div className="space-y-4">
                <div className="glass rounded-3xl p-6">
                  <p className="text-xs font-mono text-muted-foreground uppercase mb-1">AI Diagnosis</p>
                  <h3 className="font-display text-2xl text-secondary">{active.diagnosis}</h3>
                  <p className="text-sm text-muted-foreground mt-2">Confidence: {active.confidence}%</p>
                </div>
                <div className="glass rounded-3xl p-6">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Override diagnosis (optional)</label>
                  <input value={override} onChange={(e) => setOverride(e.target.value)}
                    placeholder="Leave blank to keep AI diagnosis"
                    className="mt-2 w-full bg-input/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40" />
                </div>
                <div className="glass rounded-3xl p-6">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Clinical notes</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="mt-2 bg-input/40" placeholder="Recommendations for the patient…" />
                </div>
                <Button variant="hero" size="lg" className="w-full" onClick={markReviewed}>Mark as Reviewed</Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EcgQueue;

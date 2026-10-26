import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Users, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: ecgs } = await supabase.from("ecg_uploads").select("user_id, created_at, diagnosis, status, confidence").order("created_at", { ascending: false });
      const map = new Map<string, any>();
      (ecgs ?? []).forEach((e: any) => { if (!map.has(e.user_id)) map.set(e.user_id, e); });
      const ids = [...map.keys()];
      if (ids.length === 0) { setPatients([]); return; }
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      const merged = (profs ?? []).map((p: any) => ({ ...p, last: map.get(p.user_id) }));
      setPatients(merged);
    };
    load();
  }, []);

  const filtered = patients.filter(p => !q || (p.display_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-2">Roster</p>
        <h1 className="font-display text-4xl">Patients</h1>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients…" className="pl-10 h-11 bg-input/40 rounded-full" />
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          No patient data yet
        </div>
      ) : (
        <div className="glass rounded-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-xs font-mono uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Last ECG</th>
                <th className="text-left p-4">Diagnosis</th>
                <th className="text-left p-4">Confidence</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <motion.tr key={p.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/doctor/patients/${p.user_id}`)}
                  className="border-t border-white/5 hover:bg-white/[0.04] cursor-pointer transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-coral grid place-items-center font-mono text-xs text-white">
                        {(p.display_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{p.display_name ?? "Unknown"}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{new Date(p.last.created_at).toLocaleDateString()}</td>
                  <td className="p-4">{p.last.diagnosis ?? "—"}</td>
                  <td className="p-4 font-mono text-secondary">{p.last.confidence ?? 0}%</td>
                  <td className="p-4 text-muted-foreground"><ChevronRight className="h-4 w-4" /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Patients;

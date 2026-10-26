import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, FileSearch, Calendar, MessageSquare, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const DoctorDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ patients: 0, today: 0, pending: 0, unread: 0 });
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ count: pending }, { data: q }] = await Promise.all([
        supabase.from("ecg_uploads").select("*", { count: "exact", head: true }).eq("doctor_reviewed", false),
        supabase.from("ecg_uploads").select("*").eq("doctor_reviewed", false).order("created_at", { ascending: false }).limit(8),
      ]);
      setQueue(q ?? []);
      setStats({ patients: 12, today: 3, pending: pending ?? 0, unread: 0 });
    };
    load();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <p className="text-sm text-muted-foreground font-mono">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="font-display text-4xl mt-1">Welcome, {profile?.display_name?.split(" ")[0] ?? "Doctor"}</h1>
        <p className="text-secondary font-mono text-sm mt-1">{profile?.specialty}</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={Users} label="Total Patients" value={stats.patients} />
        <Stat icon={Calendar} label="Today's Consults" value={stats.today} />
        <Stat icon={FileSearch} label="Pending Reviews" value={stats.pending} accent="text-primary" />
        <Stat icon={MessageSquare} label="Unread Messages" value={stats.unread} />
      </div>

      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl">ECG Review Queue</h2>
          <Link to="/doctor/ecg-queue"><Button variant="ghost" size="sm">View all <ArrowUpRight className="h-3 w-3" /></Button></Link>
        </div>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No pending reviews 🎉</p>
        ) : (
          <div className="space-y-2">
            {queue.map((q) => (
              <Link key={q.id} to={`/doctor/ecg-queue`}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 border border-secondary/30 grid place-items-center">
                  <FileSearch className="h-4 w-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{q.diagnosis ?? "Pending"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{new Date(q.created_at).toLocaleString()}</div>
                </div>
                {q.confidence && (
                  <span className="text-xs font-mono text-secondary">{q.confidence}%</span>
                )}
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, accent }: any) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
    <div className={`font-display text-3xl mt-3 ${accent ?? ""}`}>{value}</div>
  </motion.div>
);

export default DoctorDashboard;

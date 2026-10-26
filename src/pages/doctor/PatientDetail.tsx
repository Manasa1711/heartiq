import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, FileText, MessageSquare, Pill, NotebookPen, Calendar, Activity, Phone, Clock, Upload as UploadIcon, Download, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getOrCreateConversation } from "@/hooks/useConversations";
import { Thread } from "@/pages/Chat";
import type { Conversation } from "@/hooks/useConversations";
import { toast } from "sonner";

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [ecgs, setEcgs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [rx, setRx] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [rxText, setRxText] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [embeddedConv, setEmbeddedConv] = useState<Conversation | null>(null);

  const refresh = async () => {
    if (!id) return;
    const [{ data: p }, { data: e }, { data: n }, { data: r }, { data: a }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("ecg_uploads").select("*").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("patient_notes").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("prescriptions").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("audit_log").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(40),
    ]);
    setPatient(p);
    setEcgs(e ?? []);
    setNotes(n ?? []);
    setRx(r ?? []);
    setAudit(a ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [id]);

  const addNote = async () => {
    if (!noteText.trim() || !user || !id) return;
    const { error } = await supabase.from("patient_notes").insert({ patient_id: id, doctor_id: user.id, content: noteText });
    if (error) return toast.error("Failed to save note");
    setNoteText("");
    toast.success("Note added");
    refresh();
  };

  const addRx = async () => {
    if (!rxText.trim() || !user || !id) return;
    const { error } = await supabase.from("prescriptions").insert({ patient_id: id, doctor_id: user.id, content: rxText });
    if (error) return toast.error("Failed to prescribe");
    setRxText("");
    toast.success("Prescription added");
    refresh();
  };

  const startChat = async () => {
    if (!user || !id) return;
    const cid = await getOrCreateConversation(id, user.id);
    if (!cid) return;
    // Build minimal Conversation for embedded Thread
    setEmbeddedConv({
      id: cid,
      patient_id: id,
      doctor_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message: "",
      last_message_at: new Date().toISOString(),
      patient_unread: 0,
      doctor_unread: 0,
      other_user_id: id,
      other_name: patient?.display_name ?? "Patient",
      other_role: "patient",
      other_specialty: null,
      other_avatar: patient?.avatar_url ?? null,
      unread: 0,
    });
    setDrawerOpen(true);
  };

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!patient) return <div className="p-10 text-muted-foreground">Patient not found.</div>;

  const initials = (patient.display_name ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-mono">
        <ArrowLeft className="h-3 w-3" /> Back to patients
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 md:p-8 mb-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="h-20 w-20 rounded-3xl bg-gradient-coral grid place-items-center font-display text-3xl text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-secondary font-mono uppercase tracking-widest">Patient</p>
            <h1 className="font-display text-3xl mt-1">{patient.display_name ?? "Unknown"}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">{ecgs.length} ECG record{ecgs.length !== 1 ? "s" : ""} · {notes.length} note{notes.length !== 1 ? "s" : ""} · {rx.length} prescription{rx.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="hero" size="sm" onClick={startChat}><MessageSquare className="h-3 w-3" /> Message</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background border-white/10">
                <SheetHeader className="px-5 py-4 border-b border-white/10">
                  <SheetTitle className="font-display text-lg flex items-center justify-between gap-3">
                    <span>Chat with {patient.display_name ?? "Patient"}</span>
                    {embeddedConv && (
                      <Link
                        to={`/doctor/chat?c=${embeddedConv.id}`}
                        className="text-[10px] font-mono text-secondary hover:text-secondary/80 inline-flex items-center gap-1"
                        onClick={() => setDrawerOpen(false)}
                      >
                        <LogIn className="h-3 w-3" /> Open full chat
                      </Link>
                    )}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {embeddedConv ? (
                    <Thread conversation={embeddedConv} embedded />
                  ) : (
                    <div className="p-10 text-center text-sm text-muted-foreground">Loading conversation…</div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: ECG history */}
        <div className="lg:col-span-2 space-y-6">
          <Section icon={Activity} title="ECG History">
            {ecgs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No ECGs uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {ecgs.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition">
                    <div className={`h-10 w-10 rounded-xl border grid place-items-center ${
                      e.status === "warning" ? "bg-warning/10 border-warning/30 text-warning" :
                      e.status === "critical" ? "bg-destructive/10 border-destructive/30 text-destructive" :
                      "bg-success/10 border-success/30 text-success"
                    }`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.diagnosis ?? "Pending diagnosis"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{new Date(e.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {e.confidence != null && <span className="text-xs font-mono text-secondary">{e.confidence}%</span>}
                      {e.doctor_reviewed ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">REVIEWED</span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">PENDING</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={Clock} title="Activity Timeline">
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No recorded activity yet.</p>
            ) : (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-white/10" aria-hidden />
                {audit.map((a) => {
                  const Icon = auditIcon(a.action);
                  return (
                    <div key={a.id} className="relative">
                      <div className="absolute -left-[18px] top-1 h-3 w-3 rounded-full bg-secondary/30 border border-secondary grid place-items-center">
                        <Icon className="h-2 w-2 text-secondary" />
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium capitalize">{a.action.replace(/_/g, " ")}</p>
                          {a.entity_type && (
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {a.entity_type}{a.metadata && Object.keys(a.metadata).length > 0 ? ` · ${Object.entries(a.metadata).slice(0, 2).map(([k, v]) => `${k}:${String(v).slice(0, 24)}`).join(" · ")}` : ""}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Right: Notes + Rx */}
        <div className="space-y-6">
          <Section icon={NotebookPen} title="Clinical Notes">
            <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} placeholder="Add a note…" className="bg-input/40 mb-2" />
            <Button size="sm" variant="hero" onClick={addNote} className="w-full mb-4">Save note</Button>
            <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
              {notes.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No notes yet.</p>}
              {notes.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-sm">
                  <p>{n.content}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={Pill} title="Prescriptions">
            <Input value={rxText} onChange={(e) => setRxText(e.target.value)} placeholder="e.g. Metoprolol 25mg BID" className="bg-input/40 mb-2" />
            <Button size="sm" variant="hero" onClick={addRx} className="w-full mb-4">Prescribe</Button>
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
              {rx.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No prescriptions.</p>}
              {rx.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-sm">
                  <p className="font-mono">{r.content}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section = ({ icon: Icon, title, children }: any) => (
  <div className="glass rounded-3xl p-6">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-secondary" />
      <h2 className="font-display text-lg">{title}</h2>
    </div>
    {children}
  </div>
);

const auditIcon = (action: string) => {
  if (action.includes("ecg")) return Activity;
  if (action.includes("message") || action.includes("chat")) return MessageSquare;
  if (action.includes("call")) return Phone;
  if (action.includes("upload")) return UploadIcon;
  if (action.includes("pdf") || action.includes("export") || action.includes("download")) return Download;
  if (action.includes("login") || action.includes("auth") || action.includes("session")) return LogIn;
  if (action.includes("note")) return NotebookPen;
  if (action.includes("rx") || action.includes("prescription")) return Pill;
  if (action.includes("appointment") || action.includes("consult")) return Calendar;
  return FileText;
};

export default PatientDetail;

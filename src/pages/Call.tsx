import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, FileUp, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Thread } from "./Chat";
import { toast } from "sonner";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
};

const Call = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [otherName, setOtherName] = useState("Caller");
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [time, setTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isInitiatorRef = useRef<boolean>(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Load session metadata
  useEffect(() => {
    const load = async () => {
      if (!sessionId || !user) return;
      const { data } = await supabase.from("call_sessions").select("*").eq("id", sessionId).maybeSingle();
      if (!data) { toast.error("Call not found"); navigate("/dashboard"); return; }
      setSession(data);
      isInitiatorRef.current = (data as any).initiator_id === user.id;
      const otherId = (data as any).initiator_id === user.id ? (data as any).receiver_id : (data as any).initiator_id;
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", otherId).maybeSingle();
      setOtherName((prof as any)?.display_name ?? "Caller");
      if ((data as any).conversation_id) {
        const { data: conv } = await supabase.from("conversations").select("*").eq("id", (data as any).conversation_id).maybeSingle();
        if (conv) setConversation({ ...conv, other_name: (prof as any)?.display_name ?? "Caller" });
      }
      if ((data as any).status === "ringing") {
        await supabase.from("call_sessions").update({ status: "active", started_at: new Date().toISOString() }).eq("id", sessionId);
      }
    };
    load();
  }, [sessionId, user, navigate]);

  // Local media
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (localVideoRef.current) localVideoRef.current.srcObject = s;
      })
      .catch(() => toast.error("Camera/microphone unavailable"));
    return () => { active = false; stream?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebRTC + signaling via Supabase broadcast
  useEffect(() => {
    if (!sessionId || !user || !stream || !session) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    // Remote stream
    const remoteStream = new MediaStream();
    pc.ontrack = (ev) => {
      ev.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      setRemoteConnected(true);
    };

    const channel = supabase.channel(`call:${sessionId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        channel.send({ type: "broadcast", event: "ice", payload: { from: user.id, candidate: ev.candidate.toJSON() } });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setRemoteConnected(false);
      }
    };

    const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      channel.send({ type: "broadcast", event: "answer", payload: { from: user.id, sdp: answer } });
      // Drain queued candidates
      for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c));
      pendingCandidatesRef.current = [];
    };

    const handleAnswer = async (sdp: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c));
      pendingCandidatesRef.current = [];
    };

    const handleIce = async (cand: RTCIceCandidateInit) => {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { console.warn("ICE add failed", e); }
      } else {
        pendingCandidatesRef.current.push(cand);
      }
    };

    channel
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        if (payload?.from && payload.from !== user.id) handleOffer(payload.sdp);
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        if (payload?.from && payload.from !== user.id) handleAnswer(payload.sdp);
      })
      .on("broadcast", { event: "ice" }, ({ payload }) => {
        if (payload?.from && payload.from !== user.id) handleIce(payload.candidate);
      })
      .on("broadcast", { event: "ready" }, async ({ payload }) => {
        // Receiver tells initiator they're online → initiator sends offer
        if (payload?.from && payload.from !== user.id && isInitiatorRef.current) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({ type: "broadcast", event: "offer", payload: { from: user.id, sdp: offer } });
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Announce we're here. Initiator waits for receiver's "ready" before sending offer.
          channel.send({ type: "broadcast", event: "ready", payload: { from: user.id } });
        }
      });

    return () => {
      pc.getSenders().forEach((s) => s.track?.stop());
      pc.close();
      pcRef.current = null;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId, user, stream, session]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { stream?.getAudioTracks().forEach(t => t.enabled = mic); }, [mic, stream]);
  useEffect(() => { stream?.getVideoTracks().forEach(t => t.enabled = cam); }, [cam, stream]);

  const end = async () => {
    if (sessionId) {
      await supabase.from("call_sessions").update({
        status: "ended",
        ended_at: new Date().toISOString(),
        duration_seconds: time,
      }).eq("id", sessionId);
    }
    pcRef.current?.close();
    stream?.getTracks().forEach(t => t.stop());
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background p-4 md:p-6 flex">
      <div className={`relative flex-1 rounded-3xl overflow-hidden bg-surface-1 border border-white/10 ${showPanel ? "lg:mr-4" : ""}`}>
        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${remoteConnected ? "opacity-100" : "opacity-0"}`}
        />
        {!remoteConnected && (
          <div className="absolute inset-0 grid place-items-center"
               style={{ background: "radial-gradient(circle at center, hsl(215 50% 14%), hsl(215 70% 5%))" }}>
            <div className="text-center">
              <div className="relative h-32 w-32 mx-auto mb-4">
                <span className="absolute inset-0 rounded-full bg-secondary/20 animate-pulse-ring" />
                <div className="relative h-32 w-32 rounded-3xl bg-gradient-coral grid place-items-center font-display text-5xl text-white">
                  {otherName.split(" ").slice(-1)[0]?.[0]}
                </div>
              </div>
              <div className="font-display text-2xl">{otherName}</div>
              <div className="text-sm text-muted-foreground mt-1">Connecting…</div>
            </div>
          </div>
        )}

        {/* Local PiP */}
        <motion.div drag dragMomentum={false}
          className="absolute bottom-24 right-4 w-40 h-28 rounded-2xl overflow-hidden border-2 border-primary/60 shadow-coral cursor-move bg-surface-3 z-10">
          {cam ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-xs text-muted-foreground font-mono">Camera off</div>
          )}
        </motion.div>

        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full glass-strong text-xs font-mono text-secondary z-10">
          ● LIVE · {String(Math.floor(time / 60)).padStart(2, "0")}:{String(time % 60).padStart(2, "0")}
        </div>

        <button onClick={() => setShowPanel(v => !v)}
          className="hidden lg:grid absolute top-4 right-4 h-10 w-10 rounded-xl glass-strong place-items-center hover:border-white/20 z-10">
          <MessageSquare className="h-4 w-4" />
        </button>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 glass-strong rounded-full z-10">
          <CtrlBtn active={mic} onClick={() => setMic(!mic)} On={Mic} Off={MicOff} />
          <CtrlBtn active={cam} onClick={() => setCam(!cam)} On={Video} Off={VideoOff} />
          <CtrlBtn active onClick={() => toast.info("Use the chat panel to share an ECG file")} On={FileUp} Off={FileUp} />
          <button onClick={end} className="h-14 w-14 rounded-full bg-destructive grid place-items-center hover:bg-destructive/90 transition active:scale-95">
            <PhoneOff className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {showPanel && conversation && (
        <aside className="hidden lg:flex flex-col w-[360px] glass rounded-3xl overflow-hidden">
          <Thread conversation={conversation} embedded />
        </aside>
      )}
    </div>
  );
};

const CtrlBtn = ({ active, onClick, On, Off }: any) => (
  <button onClick={onClick} className={`h-12 w-12 rounded-full grid place-items-center transition active:scale-95 ${
    active ? "bg-white/10 hover:bg-white/15" : "bg-destructive/20 text-destructive"
  }`}>
    {active ? <On className="h-5 w-5" /> : <Off className="h-5 w-5" />}
  </button>
);

export default Call;

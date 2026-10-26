import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, User, Phone, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const OnboardingModal = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const total = 4;
  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          display_name: name || null,
          dob: dob || null,
          gender: gender || null,
          height_cm: height ? parseInt(height, 10) : null,
          weight_kg: weight ? parseInt(weight, 10) : null,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      if (contactName || contactPhone) {
        await supabase.from("alert_thresholds").upsert(
          {
            user_id: user.id,
            emergency_contact_name: contactName || null,
            emergency_contact_phone: contactPhone || null,
            alerts_enabled: true,
          },
          { onConflict: "user_id" }
        );
      }
      await refreshProfile();
      toast.success("All set! Welcome aboard.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const canAdvance = step === 0 ? name.trim().length > 1 : true;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#050d1a]/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 shadow-panel"
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step ? "w-8 bg-[#ff2d55]" : i < step ? "w-4 bg-[#00e5cc]" : "w-4 bg-white/10"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[280px]"
          >
            {step === 0 && (
              <div className="text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-coral grid place-items-center mb-4">
                  <Heart className="h-7 w-7 text-white" />
                </div>
                <h2 className="font-display text-2xl text-white mb-2">Welcome to HeartIQ</h2>
                <p className="text-sm text-white/60 mb-6">Let's set up your profile in 4 quick steps.</p>
                <div className="text-left">
                  <Label className="text-xs text-white/60 mb-2 block">What should we call you?</Label>
                  <Input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-[#00e5cc]/10 border border-[#00e5cc]/30 grid place-items-center">
                    <User className="h-5 w-5 text-[#00e5cc]" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl text-white">About you</h2>
                    <p className="text-xs text-white/60">Helps personalize your insights</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-white/60 mb-2 block">Date of birth</Label>
                    <Input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/60 mb-2 block">Gender</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["male", "female", "other"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`px-3 py-2 rounded-xl text-xs capitalize border transition ${
                            gender === g
                              ? "bg-[#ff2d55]/20 border-[#ff2d55] text-white"
                              : "bg-white/5 border-white/10 text-white/70 hover:border-white/30"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-white/60 mb-2 block">Height (cm)</Label>
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="170"
                        className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-white/60 mb-2 block">Weight (kg)</Label>
                      <Input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="70"
                        className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-[#ff2d55]/10 border border-[#ff2d55]/30 grid place-items-center">
                    <Phone className="h-5 w-5 text-[#ff2d55]" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl text-white">Emergency contact</h2>
                    <p className="text-xs text-white/60">For SOS alerts when vitals are critical</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-white/60 mb-2 block">Contact name</Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Mom"
                      className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/60 mb-2 block">Phone number</Label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1…"
                      className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl"
                    />
                  </div>
                  <p className="text-[11px] text-white/40 mt-2">Optional — you can add this later in Vitals.</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-[#00e5cc]/10 border border-[#00e5cc]/30 grid place-items-center mb-4">
                  <CheckCircle2 className="h-7 w-7 text-[#00e5cc]" />
                </div>
                <h2 className="font-display text-2xl text-white mb-2">You're all set</h2>
                <p className="text-sm text-white/60 mb-5">Quick recap before we start:</p>
                <div className="text-left bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-sm">
                  <Row label="Name" value={name || "—"} />
                  <Row label="DOB" value={dob || "—"} />
                  <Row label="Gender" value={gender || "—"} />
                  <Row label="Height" value={height ? `${height} cm` : "—"} />
                  <Row label="Weight" value={weight ? `${weight} kg` : "—"} />
                  <Row label="Emergency" value={contactName || contactPhone || "—"} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 mt-6">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={back} className="text-white">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < total - 1 ? (
            <Button
              variant="hero"
              size="sm"
              disabled={!canAdvance}
              onClick={next}
              className="bg-[#ff2d55] hover:bg-[#ff2d55]/90"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="hero"
              size="sm"
              disabled={saving}
              onClick={finish}
              className="bg-[#ff2d55] hover:bg-[#ff2d55]/90"
            >
              {saving ? "Saving…" : "Finish setup"}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
    <span className="text-xs text-white/50 font-mono uppercase">{label}</span>
    <span className="text-sm text-white truncate ml-3 max-w-[60%] text-right">{value}</span>
  </div>
);

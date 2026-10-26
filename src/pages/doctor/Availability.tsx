import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Availability = () => {
  const { profile, refreshProfile } = useAuth();
  const [available, setAvailable] = useState(profile?.available ?? true);
  const [fee, setFee] = useState(profile?.consultation_fee?.toString() ?? "");

  useEffect(() => {
    setAvailable(profile?.available ?? true);
    setFee(profile?.consultation_fee?.toString() ?? "");
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({
      available, consultation_fee: fee ? parseFloat(fee) : null,
    }).eq("id", profile.id);
    if (error) toast.error("Failed"); else { toast.success("Saved"); refreshProfile(); }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-2">Settings</p>
        <h1 className="font-display text-4xl">Availability</h1>
      </div>

      <div className="glass rounded-3xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-lg">Online status</div>
            <div className="text-sm text-muted-foreground">{available ? "Patients can book and message you" : "You appear offline"}</div>
          </div>
          <Switch checked={available} onCheckedChange={setAvailable} />
        </div>

        <div>
          <Label>Consultation fee (USD)</Label>
          <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="85" className="mt-1.5 bg-input/40 max-w-xs" />
        </div>

        <Button variant="hero" onClick={save}>Save changes</Button>
      </div>
    </div>
  );
};

export default Availability;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Stethoscope, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { EcgCanvas } from "@/components/EcgCanvas";

const patientSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  display_name: z.string().optional(),
});
const doctorSchema = patientSchema.extend({
  display_name: z.string().min(2, "Required"),
  specialty: z.string().min(2, "Required"),
  license_number: z.string().min(3, "Required"),
});

type PatientData = z.infer<typeof patientSchema>;
type DoctorData = z.infer<typeof doctorSchema>;

const AuthPage = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {
      navigate(profile.role === "doctor" ? "/doctor/dashboard" : "/dashboard");
    }
  }, [user, profile, navigate]);

  const schema = mode === "signup" && role === "doctor" ? doctorSchema : patientSchema;
  const { register, handleSubmit, formState: { errors }, reset } =
    useForm<DoctorData>({ resolver: zodResolver(schema as any) });

  const onSubmit = async (data: DoctorData) => {
    setBusy(true);
    try {
      if (mode === "signup") {
        const meta: Record<string, string> = { role };
        if (data.display_name) meta.display_name = data.display_name;
        if (role === "doctor") {
          meta.specialty = data.specialty!;
          meta.license_number = data.license_number!;
        }
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: meta,
          },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account before signing in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    reset();
    setMode(mode === "signin" ? "signup" : "signin");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block bg-surface-1 grain overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0">
          <EcgCanvas height={300} />
        </div>
        <div className="absolute top-10 left-10"><Logo /></div>
        <div className="absolute bottom-12 left-12 right-12">
          <h2 className="font-display text-4xl mb-3">Your heart, <span className="text-gradient-coral">understood.</span></h2>
          <p className="text-muted-foreground max-w-md">Join 12,000+ patients and clinicians who replaced uncertainty with clarity.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10"><Logo /></div>
          <h1 className="font-display text-3xl mb-2">
            {mode === "signin" ? "Welcome back" : role === "doctor" ? "Join as a clinician" : "Create your account"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "signin"
              ? "Sign in to access your HeartIQ workspace."
              : role === "doctor"
              ? "Review patient ECGs and consult at scale."
              : "Start with free AI ECG analysis."}
          </p>

          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition ${
                  role === "patient" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserIcon className="h-4 w-4" /> Patient
              </button>
              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition ${
                  role === "doctor" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Stethoscope className="h-4 w-4" /> Doctor
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="display_name">Full name</Label>
                <Input id="display_name" placeholder={role === "doctor" ? "Dr. Jane Smith" : "Your name"} {...register("display_name")} className="mt-1.5 bg-input/40" />
                {errors.display_name && <p className="text-xs text-destructive mt-1">{errors.display_name.message}</p>}
              </div>
            )}

            {mode === "signup" && role === "doctor" && (
              <>
                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input id="specialty" placeholder="Cardiologist" {...register("specialty")} className="mt-1.5 bg-input/40" />
                  {errors.specialty && <p className="text-xs text-destructive mt-1">{errors.specialty.message}</p>}
                </div>
                <div>
                  <Label htmlFor="license_number">License number</Label>
                  <Input id="license_number" placeholder="IND-CARD-0000" {...register("license_number")} className="mt-1.5 bg-input/40" />
                  {errors.license_number && <p className="text-xs text-destructive mt-1">{errors.license_number.message}</p>}
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} className="mt-1.5 bg-input/40" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password")} className="mt-1.5 bg-input/40" />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button onClick={switchMode} className="mt-6 text-sm text-muted-foreground hover:text-foreground transition w-full text-center">
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

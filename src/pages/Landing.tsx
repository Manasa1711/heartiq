import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Upload as UploadIcon, Brain, Video, Activity, MessageSquare, FileBarChart, AlertTriangle, Pill, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EcgCanvas } from "@/components/EcgCanvas";
import { Logo } from "@/components/Logo";
import { Counter } from "@/components/Counter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const } }),
};

const features = [
  { icon: Brain, title: "AI ECG Analysis", desc: "Deep CNN trained on 1.2M ECG strips. Sub-second arrhythmia, ischemia, and conduction analysis.", span: "md:col-span-2 md:row-span-2", accent: "coral" },
  { icon: Video, title: "Live Video Consult", desc: "Board-certified cardiologists, on demand.", span: "", accent: "teal" },
  { icon: Pill, title: "Medicine AI", desc: "Plain-English drug info, interactions, alternatives.", span: "", accent: "coral" },
  { icon: Activity, title: "Health Tracking", desc: "Wearable sync. Trends across heart rate, HRV, blood pressure.", span: "md:col-span-2", accent: "teal" },
  { icon: AlertTriangle, title: "Emergency Alerts", desc: "Critical findings instantly escalated to your care team.", span: "", accent: "coral" },
  { icon: FileBarChart, title: "Smart Reports", desc: "Hospital-ready PDFs with annotated waveforms.", span: "", accent: "teal" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="container flex items-center justify-between py-5">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#trust" className="hover:text-foreground transition">Trust</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button variant="hero" size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center grain">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />

        <div className="container relative z-10 pt-32 pb-20">
          <motion.div initial="hidden" animate="show" className="max-w-4xl mx-auto text-center">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-muted-foreground mb-8">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              FDA-cleared AI cardiology platform
            </motion.div>
            <h1 className="font-display font-bold leading-[0.95] text-5xl sm:text-7xl md:text-8xl mb-6">
              {["AI", "That", "Reads"].map((w, i) => (
                <motion.span key={w + i} variants={fadeUp} custom={i} className="inline-block mr-4">{w}</motion.span>
              ))}
              <br />
              <motion.span variants={fadeUp} custom={3} className="inline-block text-gradient-coral">Your Heart.</motion.span>
            </h1>

            {/* ECG line — full-bleed, edge to edge */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="relative mb-8 w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]"
            >
              <EcgCanvas height={200} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute -inset-2 rounded-full border border-primary animate-pulse-ring" />
                <span className="absolute -inset-2 rounded-full border border-primary animate-pulse-ring" style={{ animationDelay: "1.1s" }} />
                <span className="block h-3 w-3 rounded-full bg-primary shadow-coral" />
              </div>
            </motion.div>

            <motion.p variants={fadeUp} custom={5} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Upload an ECG. Get instant AI analysis. Talk to a cardiologist in minutes — all from one calm, beautifully designed app.
            </motion.p>
            <motion.div variants={fadeUp} custom={6} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/upload"><Button variant="hero" size="lg" className="animate-heartbeat">Upload ECG <ArrowRight className="h-4 w-4" /></Button></Link>
              <Button variant="ghost" size="lg">Watch demo</Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-32 relative">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mb-20">
            <p className="text-sm text-secondary font-mono tracking-widest mb-3">HOW IT WORKS</p>
            <h2 className="font-display text-4xl md:text-6xl font-bold">Three steps. <span className="text-gradient-teal">Real answers.</span></h2>
          </motion.div>

          <div className="relative grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Upload your ECG", d: "Drag a screenshot, photo, PDF, or raw signal CSV. We accept formats from every major device.", icon: UploadIcon },
              { n: "02", t: "AI analyzes it", d: "Our cardiology-grade neural network detects 27 conditions in under 4 seconds.", icon: Brain },
              { n: "03", t: "Doctor reviews", d: "Need a human? A cardiologist confirms findings via secure video call.", icon: Video },
            ].map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className="glass rounded-3xl p-8 relative overflow-hidden hover:border-primary/30 transition">
                <div className="font-mono text-xs text-secondary mb-6">STEP {s.n}</div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-coral/10 border border-primary/20 grid place-items-center mb-6">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-3">{s.t}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.d}</p>
                {i < 2 && <div className="hidden md:block absolute right-[-20px] top-1/2 w-10 border-t border-dashed border-primary/40" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 relative">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mb-16">
            <p className="text-sm text-primary font-mono tracking-widest mb-3">EVERYTHING YOU NEED</p>
            <h2 className="font-display text-4xl md:text-6xl font-bold">A complete cardiac care system, in your pocket.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 md:auto-rows-[180px] gap-5">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className={`glass rounded-3xl p-7 group hover:-translate-y-2 hover:border-primary/40 transition-all duration-500 ${f.span}`}>
                <div className={`h-11 w-11 rounded-xl grid place-items-center mb-4 ${f.accent === 'coral' ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/10 border border-secondary/20'}`}>
                  <f.icon className={`h-5 w-5 ${f.accent === 'coral' ? 'text-primary' : 'text-secondary'}`} />
                </div>
                <h3 className="font-display text-xl mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section id="trust" className="py-32 relative">
        <div className="container text-center mb-16">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="font-display text-3xl md:text-5xl mb-4">
            Trusted by <span className="text-gradient-coral"><Counter to={12384} suffix="+" /></span> patients
          </motion.h2>
          <p className="text-muted-foreground">From routine checks to life-saving alerts.</p>
        </div>
        <div className="container grid md:grid-cols-3 gap-5">
          {[
            { q: "Caught my AFib episode my Apple Watch missed. Saw a cardiologist within 20 minutes.", a: "Marcus R.", role: "London, UK" },
            { q: "Finally an app that explains my ECG without scaring me. The plain-English summary is gold.", a: "Priya S.", role: "Mumbai, India" },
            { q: "I use it before every long flight. The peace of mind is worth ten times the price.", a: "Elena K.", role: "Berlin, DE" },
          ].map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass rounded-3xl p-7">
              <p className="text-foreground mb-6 leading-relaxed">"{t.q}"</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-teal grid place-items-center font-mono text-sm text-secondary-foreground">{t.a[0]}</div>
                <div>
                  <div className="text-sm font-medium">{t.a}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative">
        <div className="container">
          <div className="relative rounded-[2rem] overflow-hidden p-12 md:p-20 text-center grain"
            style={{ background: "linear-gradient(135deg, hsl(215 70% 5%), hsl(215 60% 12%))" }}>
            <div className="absolute inset-0 bg-gradient-hero opacity-60" />
            <div className="relative">
              <h2 className="font-display text-4xl md:text-7xl font-bold mb-6">Don't guess about <span className="text-gradient-coral">your heart.</span></h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">Join thousands who replaced anxiety with answers.</p>
              <Link to="/auth"><Button variant="hero" size="xl" className="animate-heartbeat">Start free <ArrowRight /></Button></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo size="sm" />
          <p>© 2025 HeartIQ. Not a substitute for emergency medical care.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

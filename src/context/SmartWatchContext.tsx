import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

export type VitalReading = {
  heartRate: number;
  spo2: number;
  steps: number;
  hrv: number;
  recordedAt: number;
};

export type Threshold = {
  max_heart_rate: number;
  min_heart_rate: number;
  min_spo2: number;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  alerts_enabled: boolean;
};

export type SmartAlert = {
  id: string;
  type: "high_hr" | "low_hr" | "low_spo2" | "irregular_rhythm";
  title: string;
  description: string;
  createdAt: number;
  severity: "warning" | "critical";
};

type Ctx = {
  isConnected: boolean;
  isConnecting: boolean;
  connectionType: "bluetooth" | "simulated" | "manual" | null;
  deviceName: string | null;
  current: VitalReading | null;
  liveHistory: VitalReading[];
  alerts: SmartAlert[];
  threshold: Threshold;
  connectBluetooth: () => Promise<void>;
  startSimulation: () => void;
  importHealthCsv: (file: File, source: "google_fit" | "apple_health") => Promise<number>;
  saveManualReading: (r: Partial<VitalReading>) => Promise<void>;
  disconnect: () => void;
  dismissAlert: (id: string) => void;
  saveThreshold: (t: Threshold) => Promise<void>;
};

const DEFAULT_THRESHOLD: Threshold = {
  max_heart_rate: 120,
  min_heart_rate: 50,
  min_spo2: 94,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  alerts_enabled: true,
};

const SmartWatchCtx = createContext<Ctx | null>(null);

export const SmartWatchProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionType, setConnectionType] = useState<Ctx["connectionType"]>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [current, setCurrent] = useState<VitalReading | null>(null);
  const [liveHistory, setLiveHistory] = useState<VitalReading[]>([]);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [threshold, setThreshold] = useState<Threshold>(DEFAULT_THRESHOLD);
  const intervalRef = useRef<number | null>(null);
  const saveCounterRef = useRef(0);
  const btCharRef = useRef<any>(null);
  const btDeviceRef = useRef<any>(null);
  const lastReadingRef = useRef<VitalReading | null>(null);

  // Load threshold
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("alert_thresholds")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setThreshold(data as Threshold);
    })();
  }, [user]);

  const triggerAlert = useCallback((alert: Omit<SmartAlert, "id" | "createdAt">) => {
    const a: SmartAlert = {
      ...alert,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setAlerts((prev) => {
      // dedupe last alert of same type within 60s
      const recent = prev.find(
        (x) => x.type === a.type && Date.now() - x.createdAt < 60_000
      );
      if (recent) return prev;
      toast.error(a.title, { description: a.description });
      return [a, ...prev].slice(0, 10);
    });
  }, []);

  const checkAlerts = useCallback(
    (r: VitalReading) => {
      if (!threshold.alerts_enabled) return null as null | SmartAlert["type"];
      if (r.heartRate > threshold.max_heart_rate) {
        triggerAlert({
          type: "high_hr",
          title: "High Heart Rate",
          description: `Your heart rate is ${r.heartRate} BPM`,
          severity: r.heartRate > threshold.max_heart_rate + 20 ? "critical" : "warning",
        });
        return "high_hr";
      }
      if (r.heartRate < threshold.min_heart_rate) {
        triggerAlert({
          type: "low_hr",
          title: "Low Heart Rate",
          description: `Your heart rate is ${r.heartRate} BPM`,
          severity: "warning",
        });
        return "low_hr";
      }
      if (r.spo2 < threshold.min_spo2) {
        triggerAlert({
          type: "low_spo2",
          title: "Low Blood Oxygen",
          description: `SpO2 is ${r.spo2}%`,
          severity: r.spo2 < threshold.min_spo2 - 4 ? "critical" : "warning",
        });
        return "low_spo2";
      }
      return null;
    },
    [threshold, triggerAlert]
  );

  const persistReading = useCallback(
    async (r: VitalReading, source: "bluetooth" | "simulation" | "manual") => {
      if (!user) return;
      const anomaly = checkAlerts(r);
      saveCounterRef.current += 1;
      // Save every ~15 ticks (≈30s at 2s/tick)
      if (saveCounterRef.current % 15 === 0 || anomaly) {
        await supabase.from("vitals_readings").insert({
          user_id: user.id,
          heart_rate: r.heartRate,
          spo2: r.spo2,
          steps: r.steps,
          hrv: r.hrv,
          source,
          is_anomaly: !!anomaly,
          anomaly_type: anomaly,
        });
      }
    },
    [user, checkAlerts]
  );

  const pushReading = useCallback(
    (r: VitalReading, source: "bluetooth" | "simulation" | "manual") => {
      lastReadingRef.current = r;
      setCurrent(r);
      setLiveHistory((prev) => [...prev.slice(-59), r]);
      void persistReading(r, source);
    },
    [persistReading]
  );

  const startSimulation = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    let hr = 72;
    let spo2 = 98;
    let steps = 4200;
    setIsConnected(true);
    setConnectionType("simulated");
    setDeviceName("Simulated Device");
    intervalRef.current = window.setInterval(() => {
      hr = Math.max(55, Math.min(110, hr + Math.round((Math.random() - 0.5) * 6)));
      // occasional spike
      if (Math.random() < 0.04) hr = Math.min(135, hr + 25);
      spo2 = Math.max(93, Math.min(99, spo2 + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.2 ? 1 : 0)));
      steps += Math.round(Math.random() * 8);
      const hrv = 35 + Math.round(Math.random() * 30);
      pushReading({ heartRate: hr, spo2, steps, hrv, recordedAt: Date.now() }, "simulation");
    }, 2000);
  }, [pushReading]);

  const connectBluetooth = useCallback(async () => {
    // Web Bluetooth requires: Chrome/Edge/Opera, HTTPS, top-level page (not iframe without permission), and a real BLE device.
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    if (!("bluetooth" in navigator)) {
      toast.error("Bluetooth not supported", {
        description: "Web Bluetooth works on Chrome/Edge desktop or Android. iOS Safari is not supported. Using simulation instead.",
      });
      startSimulation();
      return;
    }
    if (inIframe) {
      toast.message("Open in a new tab to pair", {
        description: "Bluetooth pairing is blocked inside the preview iframe. Opening the app in its own tab will let you pair a real device. Starting simulation for now.",
      });
      startSimulation();
      return;
    }
    try {
      setIsConnecting(true);
      // @ts-ignore - Web Bluetooth types not in default lib
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"],
      });
      btDeviceRef.current = device;
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService("heart_rate");
      const char = await service.getCharacteristic("heart_rate_measurement");
      btCharRef.current = char;
      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", (ev: any) => {
        const v: DataView = ev.target.value;
        const flags = v.getUint8(0);
        const is16 = flags & 0x1;
        const hr = is16 ? v.getUint16(1, true) : v.getUint8(1);
        const prev = lastReadingRef.current;
        const reading: VitalReading = {
          heartRate: hr,
          spo2: prev?.spo2 ?? 98,
          steps: prev?.steps ?? 0,
          hrv: prev?.hrv ?? 50,
          recordedAt: Date.now(),
        };
        pushReading(reading, "bluetooth");
      });
      setIsConnected(true);
      setConnectionType("bluetooth");
      setDeviceName(device.name ?? "BLE Device");
      toast.success("Wearable connected", { description: device.name ?? "BLE device streaming" });
    } catch (e: any) {
      toast.error("Bluetooth connection failed", { description: e?.message ?? "Falling back to simulation" });
      startSimulation();
    } finally {
      setIsConnecting(false);
    }
  }, [pushReading, startSimulation]);

  const disconnect = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (btCharRef.current) {
      try {
        btCharRef.current.stopNotifications();
      } catch {}
    }
    if (btDeviceRef.current?.gatt?.connected) {
      try {
        btDeviceRef.current.gatt.disconnect();
      } catch {}
    }
    btCharRef.current = null;
    btDeviceRef.current = null;
    setIsConnected(false);
    setConnectionType(null);
    setDeviceName(null);
    setCurrent(null);
    setLiveHistory([]);
  }, []);

  const importHealthCsv = useCallback(
    async (file: File, source: "google_fit" | "apple_health") => {
      if (!user) return 0;
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      // Try to detect header
      const header = lines[0]?.toLowerCase();
      const hasHeader = header?.includes("heart") || header?.includes("rate") || header?.includes("date");
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const rows: any[] = [];
      for (const line of dataLines.slice(0, 5000)) {
        const parts = line.split(",").map((s) => s.trim());
        // Assume first col is timestamp/date, find any int 30..220 as HR
        const hr = parts.map((p) => parseInt(p, 10)).find((n) => n >= 30 && n <= 220);
        const ts = parts.find((p) => /\d{4}-\d{2}-\d{2}/.test(p)) ?? new Date().toISOString();
        if (hr) {
          rows.push({
            user_id: user.id,
            heart_rate: hr,
            source,
            recorded_at: new Date(ts).toISOString(),
          });
        }
      }
      if (rows.length === 0) {
        toast.error("No valid heart-rate data found in file");
        return 0;
      }
      // Chunk insert
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("vitals_readings").insert(rows.slice(i, i + 500));
      }
      toast.success(`Imported ${rows.length} readings`);
      return rows.length;
    },
    [user]
  );

  const saveManualReading = useCallback(
    async (r: Partial<VitalReading>) => {
      if (!user || !r.heartRate) return;
      const reading: VitalReading = {
        heartRate: r.heartRate,
        spo2: r.spo2 ?? 98,
        steps: r.steps ?? 0,
        hrv: r.hrv ?? 50,
        recordedAt: Date.now(),
      };
      const anomaly = checkAlerts(reading);
      await supabase.from("vitals_readings").insert({
        user_id: user.id,
        heart_rate: reading.heartRate,
        spo2: reading.spo2,
        steps: reading.steps,
        hrv: reading.hrv,
        source: "manual",
        is_anomaly: !!anomaly,
        anomaly_type: anomaly,
      });
      lastReadingRef.current = reading;
      setCurrent(reading);
      setLiveHistory((prev) => [...prev.slice(-59), reading]);
      setConnectionType((prev) => prev ?? "manual");
      toast.success("Reading saved");
    },
    [user, checkAlerts]
  );

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const saveThreshold = useCallback(
    async (t: Threshold) => {
      if (!user) return;
      setThreshold(t);
      const { error } = await supabase
        .from("alert_thresholds")
        .upsert({ ...t, user_id: user.id }, { onConflict: "user_id" });
      if (error) toast.error("Couldn't save thresholds");
      else toast.success("Alert thresholds saved");
    },
    [user]
  );

  useEffect(() => () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  }, []);

  return (
    <SmartWatchCtx.Provider
      value={{
        isConnected,
        isConnecting,
        connectionType,
        deviceName,
        current,
        liveHistory,
        alerts,
        threshold,
        connectBluetooth,
        startSimulation,
        importHealthCsv,
        saveManualReading,
        disconnect,
        dismissAlert,
        saveThreshold,
      }}
    >
      {children}
    </SmartWatchCtx.Provider>
  );
};

export const useSmartwatch = () => {
  const ctx = useContext(SmartWatchCtx);
  if (!ctx) throw new Error("useSmartwatch must be used inside SmartWatchProvider");
  return ctx;
};

export const mockEcgHistory = [
  { date: "Mon", bpm: 68, status: "normal" },
  { date: "Tue", bpm: 72, status: "normal" },
  { date: "Wed", bpm: 88, status: "warning" },
  { date: "Thu", bpm: 70, status: "normal" },
  { date: "Fri", bpm: 75, status: "normal" },
  { date: "Sat", bpm: 82, status: "normal" },
  { date: "Sun", bpm: 71, status: "normal" },
];

export const mockResults = [
  {
    id: "ecg_001",
    date: "2025-04-22",
    diagnosis: "Normal Sinus Rhythm",
    status: "normal" as const,
    confidence: 96,
    explanation: "Your ECG shows a regular rhythm with normal intervals. The electrical activity in your heart is conducting smoothly through all chambers. No signs of arrhythmia, ischemia, or conduction abnormalities were detected.",
    findings: [
      { label: "Heart Rate", value: "72 BPM", normal: true, range: "60-100 BPM" },
      { label: "PR Interval", value: "160 ms", normal: true, range: "120-200 ms" },
      { label: "QRS Duration", value: "92 ms", normal: true, range: "<120 ms" },
      { label: "QT Interval", value: "402 ms", normal: true, range: "350-450 ms" },
    ],
    risks: ["No risk factors detected"],
  },
  {
    id: "ecg_002",
    date: "2025-04-15",
    diagnosis: "Mild Sinus Tachycardia",
    status: "warning" as const,
    confidence: 89,
    explanation: "Your heart rate was slightly elevated during this recording. This can be caused by stress, caffeine, dehydration, or physical activity. The underlying rhythm is regular and the conduction pattern looks healthy.",
    findings: [
      { label: "Heart Rate", value: "108 BPM", normal: false, range: "60-100 BPM" },
      { label: "PR Interval", value: "148 ms", normal: true, range: "120-200 ms" },
      { label: "QRS Duration", value: "88 ms", normal: true, range: "<120 ms" },
      { label: "QT Interval", value: "368 ms", normal: true, range: "350-450 ms" },
    ],
    risks: ["Caffeine sensitivity", "Stress response"],
  },
  {
    id: "ecg_003",
    date: "2025-04-08",
    diagnosis: "Normal Sinus Rhythm",
    status: "normal" as const,
    confidence: 94,
    explanation: "Excellent rhythm. All intervals fall comfortably within healthy ranges.",
    findings: [
      { label: "Heart Rate", value: "66 BPM", normal: true, range: "60-100 BPM" },
      { label: "PR Interval", value: "154 ms", normal: true, range: "120-200 ms" },
      { label: "QRS Duration", value: "90 ms", normal: true, range: "<120 ms" },
      { label: "QT Interval", value: "410 ms", normal: true, range: "350-450 ms" },
    ],
    risks: [],
  },
];

export const mockDoctors = [
  { id: "d1", name: "Dr. Aanya Mehta", specialty: "Interventional Cardiology", rating: 4.9, years: 14, online: true, next: "Today, 4:30 PM", languages: ["English", "Hindi"] },
  { id: "d2", name: "Dr. Marcus Chen", specialty: "Electrophysiology", rating: 4.8, years: 11, online: true, next: "Today, 6:00 PM", languages: ["English", "Mandarin"] },
  { id: "d3", name: "Dr. Sofia Reyes", specialty: "Preventive Cardiology", rating: 4.9, years: 9, online: false, next: "Tomorrow, 9:00 AM", languages: ["English", "Spanish"] },
  { id: "d4", name: "Dr. James Whitaker", specialty: "Heart Failure Specialist", rating: 4.7, years: 18, online: true, next: "Today, 8:15 PM", languages: ["English"] },
  { id: "d5", name: "Dr. Lina Ahmadi", specialty: "Pediatric Cardiology", rating: 5.0, years: 12, online: false, next: "Tomorrow, 11:30 AM", languages: ["English", "Arabic", "French"] },
];

export const mockMedicines = [
  { name: "Metoprolol", generic: "Metoprolol Tartrate", class: "Beta Blocker" },
  { name: "Atorvastatin", generic: "Atorvastatin Calcium", class: "Statin" },
  { name: "Lisinopril", generic: "Lisinopril", class: "ACE Inhibitor" },
  { name: "Apixaban", generic: "Apixaban", class: "Anticoagulant" },
  { name: "Amlodipine", generic: "Amlodipine Besylate", class: "Calcium Channel Blocker" },
  { name: "Clopidogrel", generic: "Clopidogrel Bisulfate", class: "Antiplatelet" },
  { name: "Furosemide", generic: "Furosemide", class: "Loop Diuretic" },
  { name: "Warfarin", generic: "Warfarin Sodium", class: "Anticoagulant" },
  { name: "Aspirin", generic: "Acetylsalicylic Acid", class: "Antiplatelet" },
  { name: "Carvedilol", generic: "Carvedilol", class: "Beta Blocker" },
];

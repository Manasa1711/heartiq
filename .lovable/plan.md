

# Finish remaining HeartIQ upgrades

I'll deliver all 9 outstanding items in a single pass, grouped by file. No design changes — only additive features that match the existing dark navy + crimson + teal glassmorphism system.

## 1. Onboarding flow modal
**New file:** `src/components/OnboardingModal.tsx` — 4-step wizard (framer-motion slide transitions):
- Step 1: Welcome + display name
- Step 2: DOB, gender, height, weight
- Step 3: Emergency contact (name + phone) → writes to `alert_thresholds`
- Step 4: Review + finish → updates `profiles.onboarding_completed = true`

**Mount point:** `src/components/AppShell.tsx` — render when `profile.role === "patient" && !profile.onboarding_completed`. Calls `refreshProfile()` on completion.

## 2. PDF export on Results page
**Edit:** `src/pages/Results.tsx`
- Add `ref` around the report content area
- New "Download PDF" button in the action grid (next to Image/Consult)
- On click: `html2canvas(ref, { backgroundColor: "#050d1a", scale: 2 })` → `jsPDF` A4 portrait → save as `HeartIQ_Report_<id>.pdf`
- Show toast on start/finish, log via `logAudit("ecg_pdf_exported", "ecg_uploads", id)`

## 3. Vitals widget on Dashboard
**Edit:** `src/pages/Dashboard.tsx`
- Add a new glass card in the right column (above "My Doctor"): "Live Vitals"
- Reads `useSmartwatch()` — shows current HR, SpO2, last sync, mini sparkline of `liveHistory`
- If not connected: CTA button → `/vitals`
- If connected with active alerts: red badge with count

## 4. Chat drawer on PatientDetail
**Edit:** `src/pages/doctor/PatientDetail.tsx`
- Replace the "Message" header button behavior: instead of navigating, open a right-side `Sheet` (shadcn) drawer
- Inside the sheet: render the existing `Thread` component with `embedded={true}`, lazy-loaded with the conversation fetched via `getOrCreateConversation`
- Keep a secondary "Open full chat" link inside the drawer that navigates to `/doctor/chat?c=<id>`

## 5. "View ECG Results" header button in MessageThread
**Edit:** `src/pages/Chat.tsx` (Thread component header)
- Next to the Video Call button, add an "ECG" button (only when the other party is a patient — derived from `conversation.other_role`)
- On click: query latest `ecg_uploads` for that patient, navigate to `/doctor/patients/<patient_id>` for doctors, or `/results/latest` for patients
- For doctors specifically, show a small dropdown listing the 3 most recent ECG IDs

## 6. Audit log timeline on PatientDetail
**Edit:** `src/pages/doctor/PatientDetail.tsx`
- New left-column section "Activity Timeline" below ECG History
- Reads `audit_log` filtered by `user_id = patient.user_id` (RLS already permits this for the patient's doctor)
- Vertical timeline with icon per action type (ecg_uploaded, ecg_pdf_exported, message_sent, call_started, login, etc.), relative timestamp, metadata snippet

## 7. Session timeout warning
**New file:** `src/hooks/useSessionTimeout.ts`
- Tracks last activity (mousemove/keydown/click, throttled to 30s)
- At 25 min idle → show warning toast/modal "You'll be signed out in 5 minutes"
- At 30 min → `supabase.auth.signOut()` + redirect to `/auth?reason=timeout`
- Logs `session_timeout` audit event

**Mount:** Inside `AppShell` and `DoctorShell`.

## 8. Wire client-side rate limits
**New file:** `src/hooks/useRateLimit.ts` — thin React wrapper around existing `lib/rateLimit.ts` that exposes `{ check, peek, formatReset }`.

Wire into:
- **`Chatbot.tsx`** — 20 messages/hour. Block input + show inline notice with reset time
- **`Medicines.tsx`** — 30 lookups/hour. Disable search button when exhausted
- **`Upload.tsx`** — 10 uploads/day, ALSO call `ecgUploadsTodayCount` (server-side check via existing helper) to prevent localStorage bypass for the per-day cap

Note: Per platform guidance, this is **client-side only** (best-effort, easily bypassed). Server-side rate limiting isn't supported yet.

## 9. 7-day / 30-day vitals history tabs
**Edit:** `src/pages/Vitals.tsx`
- New "History" section below the live dashboard using shadcn `Tabs` (7D / 30D)
- Queries `vitals_readings` by `recorded_at >= now() - interval`
- Shows: avg/min/max HR, avg SpO2, total steps, anomaly count, and a recharts `AreaChart` of HR over time
- Empty state: prompt to keep watch connected

---

## Technical notes
- All animations: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}`, staggered children at 0.05s
- All new colors: `#ff2d55` crimson, `#00e5cc` teal, `#050d1a` bg, glassmorphism (`bg-white/5 backdrop-blur-sm border-white/10 rounded-2xl`)
- No new dependencies needed (jsPDF, html2canvas, date-fns, recharts already installed)
- No DB migrations needed — schema already supports everything
- No edge function changes
- All audit log entries use existing `logAudit()` helper
- Touch targets ≥44px on mobile; bottom-nav clearance preserved (already fixed last turn)

## Files touched
**New:** `OnboardingModal.tsx`, `useSessionTimeout.ts`, `useRateLimit.ts`
**Edited:** `AppShell.tsx`, `DoctorShell.tsx`, `Dashboard.tsx`, `Results.tsx`, `Chat.tsx`, `Chatbot.tsx`, `Medicines.tsx`, `Upload.tsx`, `Vitals.tsx`, `doctor/PatientDetail.tsx`

Approve and I'll switch to default mode and build all 9 in one go.


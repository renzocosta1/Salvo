# Salvo — Master Specification (Single Source of Truth)

**Version:** 1.0  
**Status:** Final — Pre-Implementation  
**Last updated:** Per refined technical decisions.

---

## Overview

Salvo is a mission-critical community coordination app: a hierarchy-driven action engine that turns digital intent into real-world presence. It is **not** a social network. It uses a strict social contract (The Oath) and a meritocratic rank system so that only verified, active members gain access to higher-level Spoils and Directives.

**Problem:** Communities struggle to turn online intent into measurable, verified real-world action. Existing tools are either too noisy (social feeds) or too flat (no hierarchy, no proof).

**Who it's for:** Organized political/community groups (e.g. "The Hard Party") with a clear chain of command (General → Captains → Warriors) who need one-way directives, proof of action, and a shared sense of progress (Pillage Meter) and territory (Fog of War map).

**Success:** Users sign The Oath, complete missions with AI-verified proof, contribute Salvos to per-directive goals, and reveal map tiles by checking in—all with real-time feedback and offline-tolerant behavior.

---

## Core Features

- **The Gates (Auth & Progression):** Level 0 entry after signing The Oath. Advancement to Warrior (Level 5) requires 3 AI-verified missions; Centurion (Level 10) is manually approved. Ranks and XP stored in Supabase; rank updates via DB functions.
- **The Command Feed (Directives):** One-way channel from General to ranks. No comments. Each directive has a `target_goal` for its Pillage Meter. Directives can be party-wide or scoped to specific Warrior Bands.
- **The Pillage Meter:** **Per-directive.** Each directive has a goal (e.g. 1,000 Salvos). Meter resets with every new directive. Real-time updates via Supabase Realtime (broadcast/changes on salvos for that directive).
- **The Front Lines (Fog of War):** **H3 hexagonal grid at Resolution 9** (~0.1 km²). Map is 3D-perspective tactical view (Pokemon Go feel). Tiles are dark by default; they turn "Hard Party Green" only when a user checks in. No pre-seeding—tile rows created in Supabase only on first check-in.
- **Proof of Action (AI Verification):** **Async pipeline.** User submits photo → Edge Function sends image + mission context to Gemini 1.5 Flash → Success/Fail → update `user_missions` (verified/rejected). No blocking wait; UI shows "Verification Pending."
- **Hierarchy:** Single root = The Hard Party. Sub-units = Warrior Bands (led by Captains). Roles: General (super admin), Captain (band leader), Warrior (standard). Single `role` column in `profiles`: `['general', 'captain', 'warrior']`.
- **The Oath:** **Hard gate.** Scroll-to-bottom mandatory; "Join" disabled until full scroll. Store `oath_signed_at` and `contract_version_id`. No app access (Command Feed, Map, etc.) until signed; then assign to Hard Party at Level 0.
- **Offline:** Best-effort sync. Queue check-ins and Raids in expo-sqlite; fire to Supabase when connectivity returns.

---

## User Experience

- **Personas:** General (sends directives, sees full picture), Captain (leads band, sees band scope), Warrior/Recruit (receives directives, completes missions, Raids, check-ins).
- **Key flow (Command Flow):** Recruit/Officer logs in → View Command Feed (Active Directives) → Select Mission/Raid (e.g. Target: School Board) → Execute Directive (One-Tap Call/Email) → Upload Proof of Action (Photo/Screenshot) → AI Vision Verification (Processing…) → Victory Screen Unlocked (XP + Rank Up) → View Territory Map (Check Capture Progress). Internal "Ghost Primary" (Choose Target) can influence which targets/missions are available.
- **UI considerations:** Oath is a full-screen overlay until signed. Map: tilted 3D, follows user location; Fog of War via Mapbox FillLayers for H3 hexagons. Pillage Meter: progress bar with real-time updates. Raid button: debounced; rate limit 10 taps per 60s per user (enforced server-side).

---

## Visual Identity & UI Components

Salvo’s UI follows a **tactical, mission-critical** aesthetic. Primary references: **Citizen App** (notification screen, colors, overall style), **Call of Duty companion app** (stats, progression, comparison), and **Clash of Clans War Log** (outcome-oriented log with green for success)—with the **base style** (dark theme, typography, layout) aligned to **Citizen**, not game UIs.

### Foundation: Citizen App

- **Dark mode:** Deep black / dark grey backgrounds everywhere. No light-mode default. Reduces noise and supports a “command center” feel.
- **Typography:** Clean sans-serif; bold for titles and key numbers, regular for descriptions. Strong hierarchy so directives and stats are scannable.
- **Notification / feed style:** High-contrast white (or light grey) text on dark; clear titles, short descriptions, distinct timestamps. Minimal decoration; no comments or social clutter. This is the **baseline** for the Command Feed and alerts.
- **Accent use:** One primary accent for primary actions and key status (e.g. CTA buttons, “new” badges). Secondary accent for success or positive state (see Hard Party Green below).
- **Icons:** Simple, recognizable, monochrome or single-accent. Same approach for nav, directive types, and map controls.

### Command Feed: “War Log” Style (Citizen Aesthetic)

The Command Feed is a **one-way, outcome-oriented log** of directives—inspired by the **Clash of Clans War Log** (distinct entries, clear outcome, green for success) but **visually executed like Citizen** (dark, clean, minimal).

- **Per-entry (per directive):**
  - **Card/row:** One card or row per directive. Same clean, dark card style as Citizen alert cards: dark background, subtle border or separation, no texture or “gamey” chrome.
  - **Timestamp:** Prominent relative or absolute time (e.g. “2h ago”, “Oct 15”) on the left or top.
  - **Title:** Bold directive title (e.g. “Target: School Board”, “Flood the Inbox”).
  - **Short description:** One line of body or context if needed; keep it scannable.
  - **Pillage Meter on card:** Current progress vs target (e.g. “847 / 1,000 Salvos”) or a compact progress bar. Visually emphasize progress without clutter.
  - **Status / outcome color:** Use **green** (Hard Party Green) for **completed** directives (goal reached). Use a neutral or warning color for in-progress; optional red or accent for critical/urgent. **Green = success**, like CoC War Log, but rendered with Citizen’s flat, modern look (no gradients or heavy borders).
  - **Action:** One primary action per card: “Raid” (one-tap) for active directives, or “View” / “Details” for completed. No comments, no likes—only action.
- **List behavior:** Chronological (newest first or configurable). Optional filters (e.g. Active vs Completed) with minimal, Citizen-style controls.
- **Noise:** No comments, no feed-style engagement. One-way Command Feed only.

This gives a **War Log–style Command Feed**: each directive is a clear “battle” entry with outcome (green when done) and metrics, in a **Citizen-like** dark, clean UI.

### Stats & Progression: Call of Duty–Style

- **Profile / stats screen:** Level, rank name, and XP front and center (e.g. “Level 5 | Warrior”, “12,400 XP”). Large, bold numbers; clear hierarchy.
- **Pillage Meter (per-directive):** Where space allows, use **circular or semi-circular gauges** (Call of Duty–style) for “current Salvos / target_goal” on the active directive, in addition to or instead of a simple progress bar. Orange or accent for fill; green when goal reached.
- **Comparisons:** Users can **compare stats** and **look up other accounts** (e.g. by display name or band). Show level, rank, XP, and optionally Salvos count or completed directives in the same bold, readable style. Layout similar to CoD stats: clear labels, big numbers, optional “VIEW MORE” for detail.
- **Victory / completion:** After AI verification or goal hit, use a **Victory-style moment**: green accent, clear “XP + Rank Up” or “Directive Complete” message, then return to feed or map. Keep it short and tactical, not playful.

### Map: Fog of War (Citizen + Hard Party Green)

- **Base map:** Dark, low-chroma base map (streets, outlines in dark grey/white). Same philosophy as Citizen’s dark map: focus on overlays and status, not map decoration.
- **Fog:** Unrevealed H3 tiles = dark or semi-transparent overlay (no detail).
- **Revealed:** Revealed H3 tiles = **Hard Party Green** (solid or tint). Clear contrast with fog; no other colors for “revealed” state.
- **Controls:** White or light iconography (e.g. location, close) on dark; minimal chrome. Matches Citizen’s map controls.

### Color Palette (Summary)

- **Backgrounds:** Black / dark grey (#0a0a0a–#1a1a1a range).
- **Text:** White / light grey for primary; muted grey for secondary.
- **Primary accent:** Orange or blue for primary actions (e.g. Raid, Join). Pick one and use consistently.
- **Success / completed / revealed:** **Hard Party Green** (e.g. completed directive cards, Pillage Meter at goal, revealed H3 tiles, Victory screen).
- **Urgent / critical:** Red or red-orange sparingly (e.g. critical directive badge).

### Summary

- **Citizen:** Dark theme, notification/feed clarity, colors, and overall style as the base.
- **Call of Duty:** Stats layout, circular gauges for Pillage Meter, level/rank/XP prominence, compare stats and look up other accounts.
- **Clash of Clans War Log:** Command Feed as a War Log—distinct entries, green for success, clear metrics—but **styled like Citizen** (flat, dark, clean, no gamey texture).

All UI work (Command Feed, Pillage Meter, profile, map, Oath) should follow this **tactical UI** identity so the app feels like a single, mission-critical system.

---

## Technical Architecture

### Tech Stack (Confirmed)

| Layer     | Choice |
|----------|--------|
| Frontend | Expo (React Native), Expo Router, Nativewind (Tailwind), Reanimated |
| Backend  | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| Maps     | Mapbox via `@rnmapbox/maps`, **H3 hexagonal grid at Resolution 9** (~0.1 km²) |
| AI       | Gemini 1.5 Flash via Supabase Edge Functions (photo verification) |
| Offline  | expo-sqlite for queuing check-ins and Raids; best-effort sync when online |

### Authentication Gate (The Gates)

- **Oath screen:** Hard blocking overlay. User cannot see Command Feed, Map, or any other feature until The Oath is signed.
- **Flow:** After sign-up (Email/Phone), app shows only Oath screen. "Join" button disabled until user scrolls to bottom of contract. On sign: store `oath_signed_at` (timestamp) and `contract_version_id` (reference to contract text version). Then assign user to The Hard Party at Level 0 and grant app access.

### Roles

- **Single role column** in `profiles`: `role TEXT CHECK (role IN ('general', 'captain', 'warrior'))`.
- **General:** Super admin. Only role that can insert into `directives`. Typically one per party.
- **Captain:** Warrior Band leaders. Can create/manage their band; see directives scoped to their band.
- **Warrior:** Standard member. Sees party-wide and band-scoped directives; completes missions, Raids, check-ins.

### Pillage Meter (Per-Directive)

- **Per-directive reset.** Each directive has `target_goal` (integer). Current count = `COUNT(salvos)` where `directive_id = directive.id`.
- **Real-time:** Clients subscribe to Supabase Realtime (e.g. `salvos` filter by `directive_id`). Progress = `current_salvos / target_goal`.
- **Raid:** One tap = one salvo. Rate limit 10 per 60s per user. Client debounce on button.

### Fog of War (H3 Res 9)

- **Strategy:** H3 hexagons at **Resolution 9**. No pre-seeding: create `h3_tiles` rows only when the **first** person checks in at that H3 index.
- **Rendering:** Mapbox FillLayers: (1) fog — all H3 hexagons in view, dark semi-transparent; (2) revealed — only tiles with `status = 'revealed'`, Hard Party Green. Map style: 3D perspective, tilted, follow user location.

### AI Verification (Async)

- **Async pipeline.** User uploads photo → record saved with `status = 'submitted'` and `proof_photo_url` → Edge Function triggered.
- **Edge Function:** Sends image + mission description to Gemini 1.5 Flash. Prompt: e.g. "Does this photo show [context]? If yes respond TRUE, if fake respond FALSE."
- **Result:** Edge Function updates `user_missions`: `status` = `verified` or `rejected`, `verified_at`, `verified_by` = `'gemini'`. Downstream: award XP and recompute rank via Rank update function.

### Data Model (Summary)

- **contract_versions** — Oath text versioning; `profiles.contract_version_id` references it.
- **ranks** — Name, level_min, level_max, is_manually_approved.
- **parties** — Root (e.g. The Hard Party); `general_user_id`.
- **warrior_bands** — Sub-units; `party_id`, `captain_id`.
- **profiles** — Extends auth.users; `party_id`, `warrior_band_id`, `role`, `rank_id`, `level`, `xp`, `oath_signed_at`, `contract_version_id`.
- **directives** — party_id, author_id, title, body, target_goal; scoped by directive_bands (empty = party-wide).
- **salvos** — user_id, directive_id, action_type, created_at.
- **missions** — directive_id (optional), party_id, title, description, xp_reward, requires_photo.
- **user_missions** — user_id, mission_id, status (pending/submitted/verified/rejected), proof_photo_url, verified_at, verified_by.
- **h3_tiles** — h3_index (PK), region, status (fog/revealed), revealed_at, revealed_by_user_id; created only on first check-in.
- **check_ins** — user_id, h3_index, region, event_type (check_in/flag), created_at. Trigger: ensure h3_tiles row exists and set status = revealed.

---

## Development Roadmap (Summary)

1. **Phase 1 — The Gates (Foundation & Auth):** Supabase project; run schema; Oath screen hard gate; scroll-to-bottom + signature; create/update profile on sign.
2. **Phase 2 — Command Feed & Pillage Meter:** List directives; directive detail + meter; Realtime subscription; Raid button (debounce, rate limit).
3. **Phase 3 — Ranks, Missions, AI Verification:** Ranks seed; missions list; submit proof; Edge Function + Gemini; award XP and recompute rank.
4. **Phase 4 — Map & Fog of War:** Mapbox + H3 Res 9; check-in flow; FillLayers fog/revealed; Realtime for tiles.
5. **Phase 5 — Offline Queue & Sync:** expo-sqlite queue; sync on foreground/network restore.
6. **Phase 6 — Hierarchy & Directive Scoping:** General-only directive create; directive_bands scoping; Warrior Bands CRUD.

---

## Logical Dependency Chain

1. **The Gates first:** Schema, Auth, Oath gate. Nothing else is usable without these.
2. **Command Feed + Pillage Meter:** Visible value: see directives and contribute Salvos with real-time meter.
3. **Ranks, missions, AI verification:** Progression and proof.
4. **Map and Fog of War:** Territory and check-ins.
5. **Offline queue and sync:** Resilience.
6. **Full hierarchy and directive scoping:** Access control and UX refinement.

---

## Risks and Mitigations

- **Technical:** H3 resolution and tile count. Res 9 + no pre-seed keeps DB small.
- **Rate limit and debounce:** Enforce in RLS or Edge Function; document for frontend.
- **MVP scope:** Phases 1–6 are atomic; future enhancements out of scope until PRD update.

---

## Appendix

- **H3 Resolution 9:** ~0.1 km²; "neighborhood block" scale. Use library (e.g. `h3-js`) to convert lat/lng ↔ h3_index.
- **Supabase Realtime:** Postgres Changes for salvos (and optionally h3_tiles).
- **Gemini 1.5 Flash:** Called from Edge Function; store API key in Supabase secrets.
- **expo-sqlite:** Offline queue only; sync on connectivity restore.

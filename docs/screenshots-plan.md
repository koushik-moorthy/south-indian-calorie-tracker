# FoodCal — Screenshots & Demo Plan

A capture plan for marketing pages, the README, app-store/PWA listings, and docs.
It is grounded in the **actual UI** (component names and on-screen copy are real),
so whoever shoots these knows exactly what they're looking at.

> **About the layout.** FoodCal is a **single scrolling page** (`app/page.tsx` →
> `components/HomeClient.tsx`), not a multi-route app. The content lives in a
> centered, mobile-first column (`max-w-xl`, ~576px). "Desktop" shots are
> therefore a centered card column on a wide canvas; many features are best
> captured as a **focused crop of one section**. The panels, top to bottom when
> signed in, are: floating **Settings ⚙️** + **theme 🌙/☀️** (top-right) →
> header → **🎯 Your Plan** → **Add Food Image** → **Analyze Food (text)** →
> **Add Manually** → **Daily Calorie Goal** → **Fasting** → **What should I
> eat?** → **Ask the coach** → **Calorie Log** → **How am I doing?** →
> **End the day**.

---

## 1. Global conventions

### Devices & viewports
| Target | Viewport (CSS px) | DPR | Notes |
| --- | --- | --- | --- |
| Desktop | 1440 × 900 | 2 | Content is a centered ~576px column. Either show the full window (whitespace framing the card) or crop tightly to the relevant panel. |
| Mobile | 390 × 844 (iPhone 14/15) | 3 | Primary form factor — the app is designed mobile-first. Use for every feature. |
| Mobile (tall content) | 390 × 844, `fullPage` | 3 | For panels taller than the viewport (Plan summary, Daily Log with macros). |

### Theme
- **Light is the primary** capture (brand orange `#f97316` reads well on white).
- Capture a **dark-mode variant** for at least the hero/onboarding and one
  data-rich panel (toggle via the **🌙** button, top-right). Dark mode is a
  selling point — show it once.

### Cleanliness / determinism
- Capture against a **production build** (`npm run build && npm start`) or the
  live app so the **Next.js Dev Tools** floating button is gone.
- **Multi-user vs single-user:** the repo currently runs in **single-user mode**
  (`SINGLE_USER_MODE=true`), so the sign-in screen shows a "private deployment"
  notice and hides sign-up. For **onboarding/marketing** shots that need the full
  sign-up flow, capture with `SINGLE_USER_MODE=false` (see
  [README → Single-user mode](../README.md)). For a **private-deployment** doc,
  capture as-is to show the locked-down screen.
- **Settings badge:** for normal feature shots, have an API key saved so the
  gear shows the green **"Key saved"** state (no amber dot). Reserve the **amber
  dot / "No key"** state for the onboarding section.
- Use a realistic but **non-sensitive email** and **blur/redact the OpenAI key**
  field everywhere it appears.
- Pin a clean device clock (e.g. round time, full battery, no notifications) for
  mobile frames.

### Seed data (capture in this state so panels aren't empty)
Shoot a "good day" so every panel has content:
- **Plan configured:** e.g. 30y male, 175cm, 80→72kg by a date ~10 weeks out →
  yields a daily target (~1,800 kcal), maintenance, deficit, BMI now/goal, macro
  targets, and a populated **Progress** chart.
- **Weigh-ins:** 5–8 check-ins trending down so the chart shows an actual line
  near the projected line, plus a "you are here" today marker.
- **Today's log:** 3–5 South Indian items (e.g. *2 idli + sambar*, *masala dosa*,
  *filter coffee*, *chicken biryani*) so totals, macros, and the goal countdown
  are meaningful and the goal bar is partway filled (not over).
- **Fasting:** one shot mid-fast (live timer running, ~60–80% bar) and one idle
  with "Last fast today" shown.
- Also deliberately capture a few **empty/first-run states** (no plan, empty log,
  "No key") for onboarding and docs.

### Capture tooling
- **Stills:** Playwright (already a dependency-adjacent tool here) for scripted,
  pixel-deterministic shots with device emulation (`page.setViewportSize`,
  `deviceScaleFactor`, `page.screenshot({ fullPage })`). This makes re-shoots
  after UI changes trivial.
- **GIFs / video:** screen-record with **Kap** or **QuickTime** (mac), or
  Playwright's `recordVideo` → convert to GIF/`webp`. Keep GIFs **≤ 12s**,
  **looped**, **≤ ~5 MB**; prefer **MP4/WebM** where the surface allows it
  (smaller, sharper) and fall back to GIF only when a video tag isn't possible.
- Show a **real cursor** and natural typing cadence in demos; trim dead time.

### File naming & location
```
docs/screenshots/<feature>-<device>-<state>.png      e.g. onboarding-mobile-signin.png
docs/screenshots/gifs/<feature>-<device>.gif|mp4     e.g. photo-upload-mobile.mp4
```
Keep `light`/`dark` in the state suffix when both exist
(`tracking-desktop-day-dark.png`).

### Priority
**P0** = hero / store / README must-haves. **P1** = supporting. **P2** = nice-to-have / docs only.

---

## 2. Onboarding  ·  P0

**Flow being told:** *Sign in → add your OpenAI key → build your plan.*
Relevant UI: `AuthForm`, the **Settings ⚙️** popover (first-run "No key"
state), `PlanForm` ("Calculate my plan").

### Ideal desktop screenshot
- The **Sign-in card** centered on a clean canvas: heading **"Sign in"**,
  subtext *"Sign in to track your daily calories."*, Email + Password fields,
  orange **Sign in** button, and the **"New here? Create an account"** toggle
  (capture in multi-user mode so sign-up is visible).
- A second shot: **first-run Settings popover** open (top-right), showing the
  **OpenAI API Key** field with helper text *"Encrypted before storage… Never
  sent back to your browser"*, the **Model** dropdown, and the amber **"No key"**
  badge — this communicates BYOK + privacy at a glance.
- A third shot: the **empty Plan setup** — **🎯 Your Plan** expanded on the
  `PlanForm` (Age, Sex, Height, Weight, Body-fat %, Goal weight, Activity level,
  Target date) with the **"Calculate my plan"** button.
- Theme: do this set in **light**, plus one **dark** hero of the sign-in card.

### Ideal mobile screenshot
- Sign-in card filling a 390-wide frame — shows how clean/native it feels on a
  phone (this is the true first impression). Keyboard **not** shown.
- First-run Settings popover on mobile (it's `w-[min(20rem,100vw-2rem)]`,
  effectively full-width) with the amber **"No key"** dot visible on the gear.
- Plan form on mobile, `fullPage`, so the whole 2-column field grid + button is
  in one tall frame.

### GIF / demo recording
- **`onboarding-mobile.mp4` (P0, ~12s):** sign in → tap **⚙️** → paste a key →
  **Save** (badge flips green **"Key saved"**) → open **🎯 Your Plan** → fill a
  couple of fields → **Calculate my plan** → the **Daily target** headline +
  macro tiles animate in. One unbroken "0-to-set-up" story.

---

## 3. Calorie tracking  ·  P0

**The core loop.** Relevant UI: `TextInputForm` + `ResultCard`,
`ManualEntryForm`, `DailyGoal`, `DailyLog` (Calorie Log) with `LogEntryEditor`,
`ExportButtons`, `NutritionBreakdown`.

### Ideal desktop screenshot
- **Hero of the result card** (`ResultCard`): type something like *"1 masala
  dosa"*, Analyze, and capture the card showing the food name, a **confidence
  badge** (aim for green **"high confidence"**), Serving Size / Quantity /
  Calories rows, the **Servings stepper** (− / value / +), the **Macros
  (estimated)** grid (Protein/Carbs/Fat/Fiber/Sugar), and the dark **"Add to
  Daily Log"** button. This single card sells the "type → instant estimate"
  promise.
- **Daily Calorie Goal** panel in its **summary state**: big **Remaining** number
  in brand orange, "X of Y kcal", and the progress bar partway filled. Capture a
  second variant **over budget** (red "Over by" + red bar).
- **Calorie Log** panel: the day table (Food Item / Calories), the **day
  navigator** (‹ date ›, "Jump to today"), **Total Calories** in orange, the
  **Day Totals** macro grid, and the **Export log · CSV · JSON** row. Hover one
  row to reveal the **✎ edit** / **✕ remove** affordances (or capture the inline
  `LogEntryEditor` open on one row).

### Ideal mobile screenshot
- The result card on mobile (single column) — emphasize the **thumb-friendly
  servings stepper** and the macro grid wrapping to 3-up.
- Daily goal countdown on mobile (the big number is the focal point).
- Calorie Log on mobile, `fullPage`: table → totals → macros → export buttons in
  one tall frame; show the day navigator centered.
- One shot of the **inline editor** open on a logged row (mobile), since editing
  is a key "you're in control" moment.

### GIF / demo recording
- **`tracking-mobile.mp4` (P0, ~10s):** type *"2 idli sambar"* → **Analyze
  Food** ("Analyzing…" → card) → nudge **Servings** to ×2 (numbers re-scale
  live) → **Add to Daily Log** → the **Daily Calorie Goal** countdown ticks down
  and the **Calorie Log** gains the row + updated total. Shows the whole loop in
  one take.
- **`tracking-edit.gif` (P1, ~6s):** tap **✎** on a row → change calories/macros
  in `LogEntryEditor` → **Save** → totals update. Optionally a tail clip of
  **Export log → CSV** triggering a download.

---

## 4. Meal photo upload  ·  P0

The most demo-able, differentiated feature. Relevant UI: `ImageUploadForm`
(Upload/Camera tabs, dropzone, preview, optional note), `CameraCapture` (live
video + shutter + flip), and the resulting `ResultCard`.

### Ideal desktop screenshot
- **Add Food Image** with the **Upload** tab active: the dashed **dropzone**
  ("Click to choose a file · drag & drop · paste with ⌘/Ctrl + V · JPG, PNG,
  WEBP · max 10 MB"), a **food photo preview** loaded beneath it, and the
  **optional note** field showing example text like *"homemade, extra ghee"*,
  then **Analyze Image**.
- The **result from a photo** (`ResultCard`) next to / below the photo so the
  "plate → numbers" cause-and-effect is obvious. Use an appetizing, real plate.

### Ideal mobile screenshot
- **Camera tab active** on a phone (`CameraCapture`): the **live viewfinder**
  filling the frame, the round **shutter** button at the bottom, the **flip
  camera** control top-right. This is the signature mobile moment — shoot it on a
  real device with the **rear camera** on actual food.
- The **"Photo captured ✓"** confirmation state + preview, then the **Analyze
  Image** button.
- The photo-derived **result card** on mobile.

### GIF / demo recording
- **`photo-upload-mobile.mp4` (P0, ~12s):** open **Camera** tab → frame a plate
  → tap **shutter** → "Photo captured ✓" → optional note *"half plate"* →
  **Analyze Image** ("Analyzing…") → result card with calories + macros →
  **Add to Daily Log**. The single most shareable clip — lead with it.
- **`photo-upload-desktop.gif` (P1, ~6s):** drag-and-drop an image file onto the
  dropzone (or paste from clipboard) → preview appears → **Analyze Image** →
  result. Highlights the desktop drag/paste affordance.

---

## 5. Fasting tracker  ·  P1

Relevant UI: `FastingTimer` (window picker, Start/End, live mono timer + progress
bar, manual start/end times, "goal reached 🎉", "Last fast today").

### Ideal desktop screenshot
- **Active fast** state: the large **monospace timer** (`16:32:05`-style) in
  brand orange, "of 16h" label, the **progress bar** ~60–80% filled, the red
  **End fast** button, and the **"Set end time"** link. This is the iconic
  fasting visual.
- A second **idle** shot: the **Window** dropdown showing presets (e.g. **16:8 ·
  16h fast**), the **Start fast** button, **"Set start time"** link, and a
  **"Last fast today: 16h 04m (target 16h)"** line beneath.
- A "**goal reached 🎉**" variant (bar green, "· goal reached 🎉") for delight.

### Ideal mobile screenshot
- Active fast on mobile — the big timer is the hero; ensure **Start/End** is
  thumb-reachable. The countdown ring/bar reads great on a phone lock-style frame.
- Idle state on mobile with the window picker open (native select sheet) to show
  the 12:12 / 16:8 / 18:6 / 20:4 / OMAD / Custom options.

### GIF / demo recording
- **`fasting-timer.gif` (P1, ~8s):** pick **16:8** → **Start fast** → the
  monospace timer begins ticking and the bar advances (speed-ramp / time-lapse
  the middle so it visibly fills) → **End fast** → "Last fast today" summary
  appears. Convey "it keeps running in the background" with a caption.

---

## 6. Weight tracking  ·  P1

Relevant UI: `WeightCheckIn` (daily check-in + recent list), `ProgressChart`
(projected dashed line + actual check-ins + today marker + goal line), `BmiBar`
(zoned gauge with marker). All live inside the **🎯 Your Plan** summary.

### Ideal desktop screenshot
- **Progress chart hero** (`ProgressChart`): the dashed **Projected** trajectory
  from start→goal, the solid orange **actual check-ins** polyline with dots, the
  vertical **today marker**, the green dashed **goal level**, axis weight labels,
  and the legend ("Projected · Your check-ins · Latest: 76.4 kg"). Frame so the
  actual line sits slightly **below** projected = "ahead of schedule" (a
  motivating story).
- **Daily weight check-in** (`WeightCheckIn`): the input + **Log/Update** button,
  the green **"Today: 76.4 kg"** badge, and the recent list with removable rows.
- **BMI gauge** (`BmiBar`): the two side-by-side **"BMI now"** / **"BMI at goal"**
  gauges with the colored zones and the marker, ideally with the marker landing
  in green **Normal**.

### Ideal mobile screenshot
- The whole **Plan → Progress** stack on mobile, `fullPage`: daily target
  headline → maintenance/deficit tiles → BMI gauges (stack to 1-up) → macro
  tiles → **Progress** chart → weight check-in. This doubles as the "personalized
  plan" showcase. The SVG chart scales responsively — verify labels stay legible
  at 390px.
- A tight crop of just the **check-in + chart** for a focused weight-tracking
  card.

### GIF / demo recording
- **`weight-checkin.gif` (P1, ~7s):** type today's weight → **Log** → green
  "Today" badge appears, a new dot lands on the **Progress** chart, the actual
  line extends, and "Latest" updates. Shows the cause→effect of a single
  check-in feeding the chart.

---

## 7. AI coach  ·  P0

Two surfaces. Relevant UI: `FoodSuggestions` ("What should I eat?") and
`AskCoach` ("Ask the coach"). Both reason over today's remaining calories/macros.

### Ideal desktop screenshot
- **"What should I eat?"** with results: the headline line + the **suggestion
  list** — each item showing a **name**, **~kcal** in orange, a short **reason**,
  and per-item **macro chips**. Capture a state where it's clearly steering toward
  what you're short on (e.g. "you're low on protein"). Tamil/South Indian items
  (sundal, rasam, buttermilk, paneer…) make it on-brand.
- **"Ask the coach"** with a **Q&A thread**: 2–3 exchanges in the gray bubbles,
  e.g. *"Is a dosa okay for dinner?"* → a grounded answer that references the
  remaining budget. Show the input with its example placeholder.

### Ideal mobile screenshot
- "What should I eat?" suggestion list on mobile — the cards + macro chips wrap
  nicely; this is where the feature feels like a pocket coach.
- "Ask the coach" thread on mobile with the question input focused (but **no OS
  keyboard** in the clean shot; optionally a separate shot **with** keyboard to
  imply chat).

### GIF / demo recording
- **`ai-coach-mobile.mp4` (P0, ~10s):** tap **Suggest foods** ("Thinking…" →
  list streams in) → scroll the suggestions → switch to **Ask the coach**, type
  *"How do I hit my remaining protein today?"* → **Ask** → answer appears in a
  bubble. Demonstrates both coach surfaces in one clip.

---

## 8. Analytics dashboard  ·  P0

> There is **no single dashboard route** — the "analytics" experience is the
> combination of the **Plan summary** (targets, maintenance, deficit, BMI, macro
> targets), the **Progress chart**, and the two **AI review panels**:
> `PerformanceReview` ("How am I doing?") and `DayInsights` ("End the day"). Treat
> this section as a **composite**.

### Ideal desktop screenshot
- **"How am I doing?"** (`PerformanceReview`) with a result: the bold
  **headline** + the labeled rows **Weight / Calories / Macros / Fasting / On
  track / Focus**. This is the richest single "analytics" artifact — make it the
  dashboard hero.
- **"End the day"** (`DayInsights`) with a result: headline, the **projected
  change chip** (green **▼ −0.2 kg** "from today's intake", or red ▲ for a
  surplus), and the **Today / This week / This month / Goal** rows.
- A **composite/stitched** "dashboard" image: Plan summary stat tiles (Daily
  target, Maintenance, Daily deficit, BMI now/goal, macro targets) **+** Progress
  chart **+** one insights panel, arranged as a 2-column collage for a landing
  page. (Stitch in design; the app itself is one column.)
- Capture one of these in **dark mode** for the "looks great day or night" beat.

### Ideal mobile screenshot
- "How am I doing?" result on mobile, `fullPage` — the rows stack into a clean
  readout.
- "End the day" on mobile with the colored **projected change chip** prominent.
- The Plan summary **stat tiles** crop (Daily target + Maintenance + Daily
  deficit) — these read like a dashboard at a glance.

### GIF / demo recording
- **`analytics-review.mp4` (P1, ~10s):** tap **Get insights** ("Reviewing…" →
  the Weight/Calories/Macros/Fasting/On-track/Focus rows populate) → scroll →
  tap **End my day** → the projected-change chip + Today/Week/Month/Goal animate
  in. Conveys "one tap → an honest, full progress read."

---

## 9. Bonus shots (P2)

- **Dark mode toggle** (`fasting-or-tracking-dark.png`): same panel in light and
  dark, side by side.
- **PWA install** (`pwa-install-mobile.png`): the "Add to Home Screen" sheet +
  the FoodCal icon on a home screen + the standalone full-screen launch.
- **Private deployment** (`single-user-signin.png`): the current single-user
  sign-in screen ("This is a private deployment — sign-ups are disabled. Sign in
  as …") — useful for the README's Single-user mode section.
- **Empty states** (`empty-log.png`, `no-plan.png`): "No items yet…" and the
  un-set Plan, for docs and to contrast with the populated hero shots.

---

## 10. Shot list summary

| # | Feature | Desktop still | Mobile still | Motion | Priority |
| --- | --- | --- | --- | --- | --- |
| 2 | Onboarding | Sign-in card; first-run Settings (No key); empty Plan form | Sign-in; Settings; Plan form (fullPage) | `onboarding-mobile.mp4` | P0 |
| 3 | Calorie tracking | Result card; Daily Goal (under/over); Calorie Log + export | Result card; goal; log (fullPage); inline editor | `tracking-mobile.mp4`, `tracking-edit.gif` | P0 |
| 4 | Meal photo upload | Upload dropzone + preview + note; photo result | Live camera + shutter; "captured ✓"; result | `photo-upload-mobile.mp4`, `photo-upload-desktop.gif` | P0 |
| 5 | Fasting tracker | Active timer + bar; idle picker; "goal reached" | Active timer; idle picker | `fasting-timer.gif` | P1 |
| 6 | Weight tracking | Progress chart; check-in; BMI gauges | Plan→Progress stack (fullPage); check-in+chart crop | `weight-checkin.gif` | P1 |
| 7 | AI coach | Suggestions list; Ask-the-coach thread | Suggestions; coach thread | `ai-coach-mobile.mp4` | P0 |
| 8 | Analytics dashboard | "How am I doing?"; "End the day"; stitched composite | Review (fullPage); End-day chip; stat tiles | `analytics-review.mp4` | P0 |
| 9 | Bonus | Dark mode; PWA install; private sign-in; empty states | — | — | P2 |

---

### Reference
- Live app: <https://foodcal.vercel.app>
- Product overview & feature copy: [`docs/PRODUCT.md`](PRODUCT.md)
- Components referenced above all live in [`components/`](../components).

# FoodCal — Demo Recordings Guide

How to record the six product demos, where to put the files, and how to turn
them into optimized GIFs for the README.

> **Why you record these (not the automation):** the Playwright MCP has no
> video-recording tool, and these flows make **live OpenAI calls** (billed to
> your key) and **write real data** to your account. Recording them by hand
> keeps you in control of cost and data.

---

## 1. Where files go

| What | Path | Naming |
| --- | --- | --- |
| **Your raw recordings** (drop them here) | `docs/demos/source/` | `<name>.mov` / `.mp4` / `.webm` |
| **Optimized GIFs** (generated, for the README) | `docs/demos/` | `<name>.gif` |

Use these **exact base names** (so the GIF script and README links line up):

| Demo | File base name |
| --- | --- |
| Onboarding | `onboarding` |
| Logging food by text | `log-food-text` |
| Logging food by image | `log-food-image` |
| Fasting flow | `fasting-flow` |
| Weight check-in | `weight-checkin` |
| AI coach | `ai-coach` |

So, e.g., record `docs/demos/source/log-food-text.mov`; the script produces
`docs/demos/log-food-text.gif`.

---

## 2. One-time setup before recording

1. **Run a clean (production) build** so the Next.js dev-tools button isn't on screen:
   ```bash
   npm run build && npm start      # serves http://localhost:3000
   ```
2. **Sign in** as the allowed account (single-user mode permits only
   `ALLOWED_EMAIL`).
3. **Theme:** click the ☀️/🌙 toggle (top-right) to pick light or dark — be
   consistent across clips. Light is the README default.
4. **Window / viewport:**
   - **Desktop clips:** size the browser window to about **720–900 px wide** so
     the centered app column is nicely framed (the app is a `max-w-xl` ≈ 576 px
     column). Record just that region.
   - **Mobile clips:** open the browser's device toolbar and pick **iPhone 15
     Pro (393 × 852)**, then record that frame.
5. **Have a food photo ready** on disk for the image demo (a real plate works best).
6. **Tidy state:** clear today's log if you want a clean start, and keep your
   email out of frame where you can (the Settings popover shows it).

### How to screen-record on macOS
- **Built-in:** press **⌘ ⇧ 5** → *Record Selected Portion* → drag a box around
  the app → **Record** → stop from the menu bar. Saves a `.mov` to your Desktop;
  move it into `docs/demos/source/` with the right name.
- **Better (optional):** [Kap](https://getkap.co) records a region and exports
  `.mp4`/`.gif` directly.

Keep each clip **~6–12 s**. Trim dead air; type at a natural pace; pause ~1 s on
the final result so it reads in a loop.

---

## 3. What to record — start → end, per demo

### `onboarding`
- **As configured (single-user):** Start on the **sign-in screen** (signed out).
  Type the email + password → click **Sign in** → the app loads. Optionally open
  **⚙️ Settings** (shows "Key saved") and expand **🎯 Your Plan**. **Stop** once
  the dashboard is visible.
- **Full onboarding (sign-up → key → plan):** only possible with
  `SINGLE_USER_MODE=false` (re-enables sign-up) and a fresh account. Start on
  **Create an account** → sign up → open **⚙️ Settings**, paste an OpenAI key →
  **Save** (badge turns green) → expand **🎯 Your Plan** → fill the form →
  **Calculate my plan**. **Stop** on the plan summary. *(See [README → Single-user
  mode](../../README.md).)*

### `log-food-text`
Start at the **"Food Name"** card. Type e.g. `1 masala dosa` → **Analyze Food**
(brief "Analyzing…") → the **result card** appears (confidence, calories,
macros). Optionally nudge **Servings** ×2. Click **Add to Daily Log**. **Stop**
when the item appears in **Calorie Log** and the **Daily Calorie Goal** updates.
*(Live OpenAI call + adds a log entry.)*

### `log-food-image`
Start at **"Add Food Image"** (Upload tab). Drag/choose your food photo → preview
shows → optional note (e.g. *homemade, extra ghee*) → **Analyze Image** → result
card → **Add to Daily Log**. **Stop** on the updated log.
*(Or: switch to the **Camera** tab → shutter → **Analyze Image**.)*
*(Live OpenAI call + adds a log entry.)*

### `fasting-flow`
Start at the **Fasting** card (idle). Pick a **Window** (e.g. `16:8`) → **Start
fast** → the live **timer** starts and the progress bar moves. **Stop** after a
few seconds — or click **End fast** to show the **"Last fast today"** summary for
a full cycle. *(Starts/ends a real fast on your account.)*

### `weight-checkin`
Expand **🎯 Your Plan** → scroll to **Daily weight check-in**. Type today's
weight → **Log** (or **Update**). **Stop** once the green **"Today" badge**
appears, a new point lands on the **Progress** chart, and the recent list
updates. *(Adds/updates a weigh-in.)*

### `ai-coach`
Start at **"Ask the coach"**. Type e.g. `How do I hit my remaining protein
today?` → **Ask** ("Thinking…") → the answer appears in a bubble. Optionally also
demo **"What should I eat?"** → **Suggest foods** → the suggestion list streams
in. **Stop** on the answer/suggestions. *(Live OpenAI calls.)*

---

## 4. Make the optimized GIFs

Once your recordings are in `docs/demos/source/`, run:

```bash
docs/demos/make-gifs.sh
```

It converts every file in `source/` into a looped, palette-optimized GIF in
`docs/demos/` (12 fps, 720 px wide by default — tune at the top of the script).
It prints each output's size so you can keep them README-friendly (aim ≤ ~5 MB).

Convert a single file, or override fps/width:
```bash
docs/demos/make-gifs.sh log-food-text          # just one
FPS=15 WIDTH=600 docs/demos/make-gifs.sh        # smaller/smoother
```

> Tip: drop me a line once the files are in `source/` and I'll run the script
> and wire the GIFs into the main README for you.

---

## 5. Embedding in the README

```markdown
### Log food by text
![Logging food by text](docs/demos/log-food-text.gif)
```

GitHub renders relative-path GIFs in `README.md`. (If you prefer crisp video,
you can instead drag an `.mp4` into a GitHub issue/PR comment to get a hosted
URL — but GIFs work with relative paths and autoplay/loop.)

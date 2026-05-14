# STUDIO — Architecture Spec

> Target: implement the **Dead Camera / Seedance Studio** UI under
> `src/app/modules/studio/` following the conventions in `AGENTS.md`.
>
> Audience: `@dev-agent` (or human dev). Read top to bottom — sections are
> ordered by dependency: types → services → atoms → sections → shell.

---

## 1. Scope & non-goals

**In scope (this PR):**

- New lazy-loaded module `modules/studio/`.
- Index page with the 5 numbered sections from the reference UI (Viewer,
  Prompt Builder, Cinematography, Output Format, Character & Assets).
- 7 reusable shared atoms under `shared/components/`.
- 3 services with native signals (no NgRx SignalStore for this iteration —
  see decision log below).
- i18n keys added to `en.json` and `es.json` under the `STUDIO` namespace.

**Out of scope (follow-up PRs):**

- BytePlus / Seedance HTTP client (only stub the `generate()` call site).
- Character Studio (Seedream) accordion contents — render the bar only.
- My Assets library accordion contents — render the bar only.
- Auth / API key vault — `addApiKey()` is a stub that just stores in the signal.
- Session reel drag-to-reorder.

---

## 2. Decisions already locked in

| Decision | Choice | Why |
| --- | --- | --- |
| State | Native signals in services | Lab choice; `store/` reserved for cross-module domain state later |
| UI primitives | Custom Tailwind | Distinctive look; PrimeNG would homogenize the studio aesthetic |
| Typography | CSS vars (`--font-display`, `--font-script`, `--font-ui`) | Real fonts swapped in later via single point of edit |
| Module shape | `modules/studio/` lazy-loaded | AGENTS.md convention |
| Forms | Native bindings (no FormControl) | Single-textarea + chip selectors don't need reactive forms; revisit if validation lands |

---

## 3. File structure

```
src/app/modules/studio/
├── studio-routing.module.ts
└── studio/
    ├── ui/
    │   ├── components/
    │   │   ├── studio-header/             # top nav (logo + API key + pills)
    │   │   ├── studio-hero/               # "LIGHTS, CAMERA, Vision ACTION"
    │   │   ├── studio-viewer/             # section 01
    │   │   ├── studio-prompt-builder/     # section 02
    │   │   ├── studio-session-reel/       # bottom strip
    │   │   ├── studio-cinematography/     # section 03
    │   │   ├── studio-output-format/      # section 04
    │   │   ├── studio-character-assets/   # section 05
    │   │   └── studio-footer/             # versioning strip
    │   └── index-studio/
    │       ├── index-studio.ts
    │       ├── index-studio.html
    │       └── index-studio.css
    ├── interfaces/
    │   └── index.ts                       # barrel — exports all studio types
    └── services/
        ├── studio.service.ts              # user, API key, project meta
        ├── prompt.service.ts              # raw input + compiled prompt
        ├── assets.service.ts              # first/last frame + free assets
        └── index.ts                       # barrel

src/app/shared/components/
├── chip-toggle-group/                     # generic chip selector (V generic)
├── pill-toggle/                           # OFF|ON, FAST|PRO
├── range-slider/                          # duration
├── drop-zone/                             # FIRST FRAME / LAST FRAME / +
├── icon-button/                           # header pill buttons
├── corner-frame/                          # decorative L-brackets
└── section-header/                        # "01 VIEWER · hint"

public/assets/i18n/
├── en.json    # add STUDIO branch
└── es.json    # add STUDIO branch
```

> The atoms live in `@shared/components/` because they're not studio-specific
> (a Toggle group could be reused in any future module). If any atom ends up
> referenced **only** by the studio after a few weeks, move it to
> `modules/studio/studio/ui/components/`.

---

## 4. Routing

Add to `app.routes.ts`:

```ts
{
  path: 'studio',
  loadChildren: () =>
    import('@modules/studio/studio-routing.module')
      .then((m) => m.StudioRoutingModule),
}
```

`studio-routing.module.ts`:

```ts
import { Routes } from '@angular/router';

export const StudioRoutingModule: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@modules/studio/studio/ui/index-studio/index-studio')
        .then((m) => m.IndexStudio),
  },
];
```

> Naming: `IndexStudio`, selector `app-index-studio`. Matches AGENTS.md
> section "Naming Conventions → Index components".

---

## 5. Domain types (`modules/studio/studio/interfaces/index.ts`)

```ts
export type AspectRatio = '16:9' | '9:16' | '21:9' | '1:1';
export type Resolution = '480p' | '720p' | '1080p';
export type Engine = 'fast' | 'pro';

export type Lens = '24mm-wide' | '35mm-classic' | '50mm-portrait' | '85mm-tele';
export type CameraBody =
  | 'arri-alexa-65' | 'red-komodo-6k' | 'sony-venice' | '16mm-film';
export type CameraMotion =
  | 'static-lock-off' | 'slow-dolly-in' | 'orbit' | 'handheld';
export type ColorGrading =
  | 'blade-runner-2049' | 'the-matrix' | 'gone-girl' | 'interstellar';
export type Genre = 'drama' | 'action' | 'noir' | 'horror';

export interface ChipOption<V extends string = string> {
  value: V;
  /** i18n key — never a literal string. */
  labelKey: string;
}

export interface CinematographyConfig {
  lens: Lens | null;
  cameraBody: CameraBody | null;
  cameraMotion: CameraMotion | null;
  colorGrading: ColorGrading | null;
  genre: Genre | null;
}

export interface OutputFormatConfig {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  /** 4–15 inclusive. */
  durationSeconds: number;
  sound: boolean;
  engine: Engine;
}

export interface ReferenceAsset {
  id: string;
  kind: 'image' | 'video' | 'audio';
  filename: string;
  /** Object URL — must be revoked when asset removed (see assets.service). */
  thumbnailUrl?: string;
  /** Auto-generated tag like "Image 1", "Video 2". */
  tag: string;
  slot: 'first-frame' | 'last-frame' | 'free';
}

export interface GeneratedClip {
  id: string;
  prompt: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: number;
  durationSeconds: number;
  resolution: Resolution;
}

export interface StudioUser {
  handle: string;
  initial: string;
}
```

> **Naming note (per AGENTS.md):** these are interfaces in a barrel
> `interfaces/index.ts`, but AGENTS.md prescribes filename `*.interface.ts`
> when an interface has its own file. Since these are colocated grouped
> types, the barrel is the cleaner approach — there's a precedent for this
> in the AGENTS.md "Core/Shared structure" section (interfaces live in
> `core/interfaces/` and are exported via `index.ts`).

---

## 6. Service contracts (signatures only — full bodies in code)

### 6.1 `studio.service.ts` — `StudioService`

```ts
@Injectable({ providedIn: 'root' })
export class StudioService {
  readonly user        : Signal<StudioUser>;
  readonly apiKey      : Signal<string | null>;
  readonly hasApiKey   : Signal<boolean>;
  readonly apiBadgeKey : Signal<string>;          // i18n key, computed
  readonly projectCode : Signal<string>;
  readonly exportCount : Signal<number>;

  setApiKey(key: string | null): void;
  setProjectCode(code: string): void;
  incrementExportCount(): void;
}
```

### 6.2 `prompt.service.ts` — `PromptService`

```ts
@Injectable({ providedIn: 'root' })
export class PromptService {
  readonly rawDescription : Signal<string>;
  readonly cinematography : Signal<CinematographyConfig>;
  readonly output         : Signal<OutputFormatConfig>;
  readonly sessionClips   : Signal<GeneratedClip[]>;
  readonly activeClip     : Signal<GeneratedClip | null>;

  /** Pure computed — raw + cinematography + output, joined. */
  readonly compiledPrompt : Signal<string>;
  readonly compiledLength : Signal<number>;

  setRawDescription(text: string): void;
  patchCinematography(patch: Partial<CinematographyConfig>): void;
  patchOutput(patch: Partial<OutputFormatConfig>): void;
  pushClip(clip: GeneratedClip): void;
  selectClip(id: string | null): void;
}
```

**`compiledPrompt` algorithm (deterministic, computed, no I/O):**

```
1. raw = rawDescription().trim()
2. if raw is empty → return ''
3. tail = []
   ├─ lens? → push humanize(lens)
   ├─ cameraBody? → push 'shot on ' + humanize(cameraBody)
   ├─ cameraMotion? → push humanize(cameraMotion)
   ├─ colorGrading? → push 'color grading: ' + humanize(colorGrading)
   └─ genre? → push humanize(genre) + ' genre'
4. tail.push(`${aspectRatio} ${resolution}`)
5. tail.push(`${durationSeconds}s`)
6. if sound → tail.push('with sound')
7. return tail.length ? `${raw}. ${tail.join(', ')}` : raw
```

`humanize(value)` = `value.replace(/-/g, ' ')`.

### 6.3 `assets.service.ts` — `AssetsService`

```ts
@Injectable({ providedIn: 'root' })
export class AssetsService implements OnDestroy {
  readonly firstFrame : Signal<ReferenceAsset | null>;
  readonly lastFrame  : Signal<ReferenceAsset | null>;
  readonly freeAssets : Signal<ReferenceAsset[]>;
  readonly totalCount : Signal<number>;

  setFirstFrame(file: File | null): void;
  setLastFrame(file: File | null): void;
  addFreeAsset(file: File): void;
  removeFreeAsset(id: string): void;
  clearAll(): void;
  ngOnDestroy(): void;   // revokes all object URLs
}
```

**Critical implementation note:**
`URL.createObjectURL(file)` leaks memory. The service must:

1. Revoke previous URL when a frame slot is overwritten.
2. Revoke URL when an asset is removed.
3. Revoke all URLs in `ngOnDestroy()`.

**Tag generation:** when adding to `freeAssets`, count existing assets of
the same `kind` and assign `tag = '${KindLabel} ${n + 1}'`, e.g. `Image 3`.

---

## 7. Shared atoms — API contracts

All atoms:
- Standalone (no `standalone: true` — Angular 21 default).
- `ChangeDetectionStrategy.OnPush`.
- `input()` / `output()` functions, never decorators.
- No `@HostBinding` / `@HostListener` — use the `host` object in the
  decorator if you need host bindings.
- No `ngClass` / `ngStyle` — use `[class.x]` / `[style.y]` bindings.

| Component | Selector | Key inputs | Key outputs |
| --- | --- | --- | --- |
| `SectionHeader` | `app-section-header` | `number: string`, `label: string` (i18n key), `hint?: string` (i18n key) | — |
| `ChipToggleGroup<V>` | `app-chip-toggle-group` | `labelKey: string \| null`, `options: ChipOption<V>[]`, `value: V \| null`, `variant: 'default' \| 'accent'` | `valueChange: V \| null` |
| `PillToggle` | `app-pill-toggle` | `leftLabelKey: string`, `rightLabelKey: string`, `value: 'left' \| 'right'`, `accentSide: 'left' \| 'right' \| 'selected'` | `valueChange: 'left' \| 'right'` |
| `RangeSlider` | `app-range-slider` | `min`, `max`, `step`, `value: number`, `ticks: number[]`, `unit: string`, `ariaLabelKey: string` | `valueChange: number` |
| `DropZone` | `app-drop-zone` | `labelKey?: string`, `placeholderKey?: string`, `accept`, `multiple`, `compact` | `filesDropped: File[]` |
| `IconButton` | `app-icon-button` | `icon?: string` (glyph), `labelKey: string`, `badgeKey?: string`, `iconColor`, `badgeColor`, `labelColor` | `clicked: void` |
| `CornerFrame` | `app-corner-frame` | `position: 'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'`, `color: string` | — |

> Toggling a chip back to off: clicking the active chip emits `null`.
> This matches the reference UI (no selection = no injection into the
> compiled prompt).

---

## 8. Styling / design tokens

Append to `src/styles.css` (or wherever the global stylesheet lives —
verify in `angular.json` "styles"):

```css
@theme {
  /* Surfaces */
  --color-ink-950: #0a0d10;
  --color-ink-900: #0d1014;
  --color-ink-850: #11151a;
  --color-ink-800: #161b21;
  --color-ink-700: #1d242c;
  --color-ink-600: #262e38;
  --color-ink-500: #3a4452;

  /* Brand accents */
  --color-brand-red:    #ef2b3a;
  --color-brand-green:  #b9ff3c;
  --color-brand-yellow: #f4c20d;
  --color-brand-purple: #9b6bff;

  /* Foreground on dark */
  --color-fg-strong: #f5f6f8;
  --color-fg:        #c9ced6;
  --color-fg-muted:  #6c7682;
  --color-fg-faint:  #444b55;
}

:root {
  --font-display: "Impact", "Oswald", system-ui, sans-serif;
  --font-script:  "Caveat", "Permanent Marker", cursive;
  --font-ui:      ui-sans-serif, system-ui, sans-serif;
  --font-mono:    ui-monospace, "JetBrains Mono", monospace;
}
```

Hero strike-through (used for "LIGHTS", "CAMERA"):

```css
.hero-strike { position: relative; display: inline-block; }
.hero-strike::after {
  content: ""; position: absolute;
  left: -2%; right: -2%; top: 50%;
  height: 0.18em; background: var(--color-fg-strong);
  transform: rotate(-1.5deg) translateY(-50%);
}
```

---

## 9. i18n keys to add

### `STUDIO` branch (add to both `en.json` and `es.json`)

```json
{
  "STUDIO": {
    "BRAND": { "PRIMARY": "Dead Camera", "SECONDARY": "Seedance Studio",
               "TAGLINE_TOP": "Studios", "TAGLINE_BOTTOM": "AI Research Lab" },
    "HERO": {
      "STRIKE_1": "Lights,", "STRIKE_2": "Camera,",
      "SCRIPT": "Vision", "LIVE": "Action",
      "SUBTITLE_TOP": "Reinvented Cinema.",
      "SUBTITLE_BOTTOM": "Absolute Creative Control."
    },
    "API": { "ADD_KEY": "Add API Key", "NO_KEY": "no key", "CONNECTED": "connected" },
    "VIEWER": {
      "TITLE": "Viewer",
      "HINT": "Final clip · evaluate quality, lip sync, sound, color",
      "EMPTY_TITLE": "No Clip Loaded",
      "EMPTY_HINT": "Generated output appears here"
    },
    "PROMPT": {
      "TITLE": "Prompt Builder",
      "HINT": "Describe the scene · the cinematographic style is injected automatically",
      "PLACEHOLDER": "Describe the scene. Be specific: subject, action, setting, atmosphere. The cinematographic language is injected automatically from your selections.",
      "COMPILED": "Compiled Prompt",
      "CHARS": "{{n}} chars",
      "GENERATE": "Generate"
    },
    "SESSION_REEL": {
      "TITLE": "Session Reel",
      "EMPTY": "Your generated clips will stack here"
    },
    "CINEMATOGRAPHY": {
      "TITLE": "Cinematography",
      "LENS": "Lens", "CAMERA_BODY": "Camera Body", "CAMERA_MOTION": "Camera Motion",
      "COLOR_GRADING": "Color Grading", "GENRE": "Genre",
      "LENSES": {
        "24MM_WIDE": "24mm Wide", "35MM_CLASSIC": "35mm Classic",
        "50MM_PORTRAIT": "50mm Portrait", "85MM_TELE": "85mm Tele"
      },
      "BODIES": {
        "ARRI_ALEXA_65": "ARRI Alexa 65", "RED_KOMODO_6K": "RED Komodo 6K",
        "SONY_VENICE": "Sony Venice", "FILM_16MM": "16mm Film"
      },
      "MOTIONS": {
        "STATIC": "Static Lock-Off", "DOLLY_IN": "Slow Dolly-In",
        "ORBIT": "Orbit", "HANDHELD": "Handheld"
      },
      "GRADES": {
        "BLADE_RUNNER": "Blade Runner 2049", "MATRIX": "The Matrix",
        "GONE_GIRL": "Gone Girl", "INTERSTELLAR": "Interstellar"
      },
      "GENRES": {
        "DRAMA": "Drama", "ACTION": "Action", "NOIR": "Noir", "HORROR": "Horror"
      }
    },
    "OUTPUT": {
      "TITLE": "Output Format",
      "ASPECT_RATIO": "Aspect Ratio", "RESOLUTION": "Resolution",
      "DURATION": "Duration", "SOUND": "Sound", "ENGINE": "Engine",
      "ON": "On", "OFF": "Off", "FAST": "Fast", "PRO": "Pro",
      "ARIA_DURATION": "Duration in seconds"
    },
    "ASSETS": {
      "TITLE": "Character & Assets",
      "CHARACTER_STUDIO": "Character Studio",
      "CHARACTER_STUDIO_HINT": "Generate trusted reference images · powered by Seedream",
      "MY_ASSETS": "My Assets",
      "MY_ASSETS_HINT": "Private trusted library · BytePlus",
      "REFERENCE": "Reference Assets",
      "COUNT": "{{n}} assets",
      "FIRST_FRAME": "First Frame", "LAST_FRAME": "Last Frame",
      "DROP_OR_CLICK": "Drop or click",
      "REFERENCE_HINT": "Reference them in your prompt as {{tag1}}, {{tag2}}, {{tag3}} … Click any tag below a thumbnail to insert it into the prompt."
    },
    "FOOTER": {
      "VERSION": "v1.0", "LIBRARY": "Assets Library",
      "TAGLINE": "The Electric Mind",
      "STUDIO": "We are Dead Camera Studios"
    }
  }
}
```

Use `GLOBAL.ACTIONS.*` from existing translation files for generic actions
where they overlap (e.g. don't redefine "Cancel" or "Close" under STUDIO).

---

## 10. Section-by-section behavior

### Viewer (01)
- Empty state: 4 dots (first red), script-font "No Clip Loaded", uppercase
  hint, four `app-corner-frame` at the corners.
- Active state: render `<video [src]="clip.videoUrl" controls>`.
- Always 16:9 aspect: use `aspect-video` Tailwind class on the wrapper.

### Prompt Builder (02)
- Textarea binds to `PromptService.rawDescription` via `(input)`.
- "Compiled Prompt" card: left border 2px brand-red, collapsible.
- Char count uses `PromptService.compiledLength()` interpolated into
  `STUDIO.PROMPT.CHARS`.
- Generate button: `disabled` when `compiledPrompt()` is empty.
- Emits `(generate)` upward to `IndexStudio.onGenerate()`.

### Session Reel
- Below the prompt builder, full-width strip.
- Empty: italic hint string.
- Populated: horizontal scroll, 128×80 tiles, active clip has brand-red border.

### Cinematography (03)
- 5 `app-chip-toggle-group` instances, variant `default`.
- Each binds to one slot of `PromptService.cinematography()`.
- Wire each `(valueChange)` to `prompt.patchCinematography({ key: v })`.

### Output Format (04)
- Aspect Ratio + Resolution use variant `accent` (selected = red).
- Duration row: label + `{{ output().durationSeconds }}s` + slider.
- Sound and Engine each use `app-pill-toggle`, both with
  `accentSide="left"` (matches the screenshot — OFF and FAST are red).

### Character & Assets (05)
- Two stub accordion bars (green for Character Studio, yellow for My Assets).
  Bodies render `▾` only — no interaction in this PR.
- Reference Assets card: dark inner bg, brand-red header.
- Two large drop zones side by side: FIRST FRAME, LAST FRAME.
- One compact `+` drop zone for free assets (multiple).
- Free asset chip row: `[Image 1] filename ×`.
- Asset count in top-right of card: pulls from `AssetsService.totalCount()`.

### Header
- Logo: square frame with inner concentric circle (SVG inline).
- Slot 1: `ADD API KEY →` with red leading dot. Click handler is a stub.
- Pills (each is `app-icon-button`): user handle, project code, export count,
  API status. Colors match the screenshot (purple, red, green, red).

### Footer
- Single row: left = brand + version + library, right = electric-mind +
  studio. Mono-style spacing, fg-muted text.

---

## 11. Things AGENTS.md forces us to remember

- **Never** add `standalone: true`. Angular 21 default.
- **Never** use `*ngIf` / `*ngFor` / `*ngSwitch`. Always `@if` / `@for` / `@switch`.
- **Never** use `ngClass` / `ngStyle`. Use `[class.x]` / `[style.x]`.
- **Never** use `@HostBinding` / `@HostListener`. Put bindings in the
  decorator `host` object.
- **Never** use constructor injection. Use `inject()`.
- **Never** call `.mutate()` on signals. Use `update()` / `set()`.
- **Path aliases**: `@app/*`, `@core/*`, `@shared/*`, `@services/*`,
  `@modules/*`. No deep relative imports.
- `NgOptimizedImage` for any static image asset (not for object-URL
  thumbnails — those are runtime).
- Prettier: print width 100, single quotes, angular HTML parser.
- 2-space indent, UTF-8, trim trailing whitespace, final newline.

---

## 12. Generate handler stub (in `IndexStudio`)

```ts
protected async onGenerate(): Promise<void> {
  const compiled = this.prompt.compiledPrompt();
  if (!compiled) return;

  // TODO follow-up PR: call SeedanceService.generate(...) and push the result.
  // For now: log so QA can verify wiring.
  console.log('[Seedance] generate →', compiled, this.prompt.output());
}
```

When the real client lands, the contract for `SeedanceService.generate()`
should accept a payload assembled from `prompt.output()` +
`assets.firstFrame()` + `assets.lastFrame()` + `assets.freeAssets()`, and
return a `GeneratedClip` that gets pushed via `prompt.pushClip(clip)`.

---

## 13. Suggested PR strategy

Split into **3 PRs** so review stays manageable:

1. **`feat(studio): shared atoms + design tokens`**
   - 7 shared components in `@shared/components/`.
   - `styles.css` token additions.
   - i18n keys for any atom-level strings (none in this case, atoms take keys).
   - No routing changes.

2. **`feat(studio): services + types`**
   - `interfaces/index.ts`, `services/{studio,prompt,assets}.service.ts`.
   - Unit tests for `compiledPrompt` computed and `assets` tag numbering.
   - No UI changes.

3. **`feat(studio): index page + sections + i18n`**
   - All 9 section components, `IndexStudio`, routing.
   - Full `STUDIO` i18n branch in `en.json` and `es.json`.
   - Add `/studio` route to `app.routes.ts`.

> If a single PR is preferred, label it
> `feat(studio): scaffold dead camera studio UI` and tag the dev-agent
> for implementation + the test-agent for the two unit test suites called
> out in PR #2.

---

## 14. Acceptance criteria (for `@qa-agent`)

- [ ] `/studio` route loads lazily; visible bundle for `app-main.js` does not
  include studio module code on initial load.
- [ ] All visible strings come from the i18n service (`en` + `es` both
  render correctly, no fallback to keys).
- [ ] Selecting any chip in Cinematography immediately changes the
  "Compiled Prompt" preview text.
- [ ] Char counter matches the visible compiled prompt length.
- [ ] Duration slider min=4 max=15 step=1, tick labels at 4/8/12/15.
- [ ] Dragging an image onto FIRST FRAME shows it as a thumbnail; dropping
  a second image replaces it and the previous object URL is revoked
  (verify in DevTools Memory).
- [ ] The Generate button is disabled when the textarea is empty.
- [ ] All AXE checks pass.
- [ ] Focus rings visible on every interactive element, brand-red color.
- [ ] No console errors / warnings on initial load and after generating
  a stub clip.

---

## 15. Open questions (escalate to lab if blocking)

1. Should the `/studio` route be the new app default (replace dashboard)?
2. The Character Studio and My Assets accordions in section 05 are stubs.
   What's the priority for their actual content?
3. Session reel persistence — clips currently die on page reload. Do we
   need IndexedDB or backend persistence in this iteration?
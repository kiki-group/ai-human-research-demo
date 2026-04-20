# AI-Driven Human Research

A mobile-first, fully client-side demo that runs AI-moderated research studies
end-to-end: design a study conversationally, edit it directly or by chat,
pick a target population, preview the AI-moderated interview your
respondents will experience, and generate a synthesized report from mock
interviews — all powered by a Gemini API key the user provides at launch.
No backend, no auth, no database.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints, paste a Gemini API key (get one at
[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)),
and start a study. The key is stored only in your browser's `localStorage`
and is only ever sent directly to `generativelanguage.googleapis.com`.

## Build

```bash
npm run build
```

Outputs a static site to `dist/`.

## Deploy

### GitHub Pages (this repo)

This repo ships with [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
that builds on every push to `main` and publishes to GitHub Pages. Enable
Pages once for the repo:

1. Repo Settings → Pages → Source: **GitHub Actions**.
2. Push to `main`. The workflow builds and publishes.
3. Site is served at `https://<org>.github.io/ai-human-research-demo/`.

The repo itself can be private while the Pages site is public (requires a
GitHub Team/Enterprise plan). `vite.config.ts` sets `base` to
`/ai-human-research-demo/` in production so assets resolve correctly. The
app uses `HashRouter`, so client-side routes survive GitHub Pages' static
hosting without server rewrites.

### Netlify

Drag-and-drop the built `dist/` folder onto the Netlify dashboard, or
connect the repo — Netlify picks up [`netlify.toml`](netlify.toml) and runs
`npm run build`. You'll want to remove the `base` from `vite.config.ts` or
serve from a subdirectory as desired.

## What's generated vs. mocked

| Step                     | Model                    | How it works                                                                                  |
| ------------------------ | ------------------------ | --------------------------------------------------------------------------------------------- |
| Study creation chat      | `gemini-3-flash-preview` | Schema-constrained JSON; returns a draft study when ready                                     |
| Conversational editing   | `gemini-3-flash-preview` | Returns a full updated study + changelog, shown as a diff before applying                     |
| Audience normalization   | `gemini-3-flash-preview` | Turns free-text audience descriptions into structured filters                                 |
| Interview preview slides | —                        | Pure UI — animated waveform + captions, **no audio plays** (demo)                             |
| Pending progress feed    | —                        | Fake counter + synthetic activity lines                                                       |
| Mock respondents + report| `gemini-3.1-pro-preview` | Generates respondents, full transcripts, and a synthesized report in one schema-constrained call, so quotes reference real mock-interview lines |

Model choices are hardcoded in [`src/lib/gemini.ts`](src/lib/gemini.ts); users
cannot pick a model. Flash handles lightweight turns; Pro handles the
heavy, internally-consistent simulation call.

## Tech

- Vite + React 19 + TypeScript
- Tailwind CSS (mobile-first + responsive sidebar at `lg+`)
- `@google/genai` SDK called directly from the browser
- `react-router-dom` `HashRouter` (friendly to GitHub Pages)
- State: React Context + `useReducer`, persisted to `localStorage`

## Project layout

```
src/
  App.tsx, main.tsx, index.css
  lib/
    gemini.ts        Wraps Gemini SDK; schema-constrained calls
    prompts.ts       System prompts for create/edit/simulate/normalize
    types.ts         Study, Question, Audience, Report, etc.
    storage.ts       localStorage + id helpers
  state/
    AppState.tsx     Context + reducer, persisted
  components/
    AppShell.tsx     Responsive shell with sidebar on desktop, drawer on mobile
    PhoneFrame.tsx   Device frame for interview previews
    Waveform.tsx     CSS-animated, visual-only waveform
    Logo.tsx, Icon.tsx
  screens/
    ApiKeyGate.tsx       Entry; validates key, stores in localStorage
    Home.tsx             Dashboard grid
    CreateStudy.tsx      Conversational drafting
    EditStudy.tsx        Direct form + chat editor with diff preview
    Audience.tsx         General / Specific picker, AI-normalized
    InterviewPreview.tsx Phone-frame slideshow
    Pending.tsx          Progress + Simulate Mock Responses
    Report.tsx           Summary, themes, replayable quotes
```

## Notes

- Everything AI-generated is explicitly labelled "simulated" in the UI so
  the demo never implies real humans were interviewed.
- "Reset API key" in the sidebar clears the stored key and returns to the
  gate.

# Heads Up — CS Operating Dashboard (Draft)

Demonstration dashboard for the **PLG Customer Success Operating Model v2.0** plan. Three views matching Section 6 of the plan:

1. **Executive** — weekly review for Mike, John, Gavin
2. **CS Leadership** — daily operational workbench for Elaine and team
3. **PLG Engagement** — weekly campaign performance for Angela, Elaine, Peter

All data is mocked. The structure, metrics, and interactions are what would be wired to real PostHog + Stripe + billing module + Jira data once the SFDC bridge is operational.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

```bash
# From the project directory:
npx vercel
# Follow prompts. First-time setup will link a Vercel project.

# For a production deploy:
npx vercel --prod
```

Or push to GitHub and import the repo in Vercel dashboard — auto-deploys on push.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (Heads Up brand palette in `tailwind.config.ts`)
- Recharts for visualization
- Lucide for icons
- Poppins (UI) + Fraunces (display) + JetBrains Mono (data) — all via Google Fonts

## File structure

```
app/
  page.tsx                       # Shell + tab nav
  layout.tsx                     # Root layout
  globals.css                    # Tailwind + brand vars
components/
  ui.tsx                         # Panel, Stat, Sparkline, MiniBar, etc.
  ExecutiveDashboard.tsx         # View 1
  CSLeadershipDashboard.tsx      # View 2 (interactive workbench)
  PLGEngagementDashboard.tsx     # View 3
lib/
  mockData.ts                    # All mock data — single source for swap to real
```

## What to swap when wiring real data

- `lib/mockData.ts` → Replace with API calls to SFDC bridge endpoints
- Add real-time refresh (Server-Sent Events or polling) for hard-trigger surfaces
- Add auth (likely SAML/OIDC against your existing IDP) before exposing real account data

## Notes for review

- This is a **design surface**, not a production app. Comment on metric selection, density, hierarchy, missing views.
- The CS Leadership view (View 2) is intentionally the most interactive — it's the workbench Elaine's team would live in daily.
- The Executive view is intentionally dense in one screen — leadership review should be one scroll, not a deck.
- Color usage follows Heads Up brand. Status colors (Green/Yellow/Red) are conventional for at-a-glance recognition.

# Wuthering Hub Web (Preview)

This is the bilingual Next.js front end added alongside the existing static WuWa Builder site.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. The root redirects to /en. Arabic is available at /ar.

## Deploy to Vercel

Import the GitHub repository and set **Root Directory** to `web`. Framework preset: Next.js. No environment variables are required for this first UI phase.

## Current scope

- Bilingual English / Arabic shell with LTR and RTL.
- Responsive homepage and navigation.
- Character roster search and filters using the existing project fallback roster.
- Portraits are loaded from the existing Encore public endpoint when available; initials are shown as fallback.
- Calculator and build-rating screens are UI foundations only. They intentionally do not fabricate damage or score results.

## Next development phase

Connect the verified roster and guide records, build character detail routes, and implement a tested damage engine with character-specific skill multipliers, defense, resistance, buffs, debuffs, and rotation events.

The existing root-level static site remains untouched.

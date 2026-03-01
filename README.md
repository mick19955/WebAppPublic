# MatematikAppV2 (prototype)

## Kør lokalt

```bash
npm install
npm run dev
```

## Noter

- Progression gemmes i `localStorage` via `src/progress/storage.ts`.
- Mastery opdateres pr. **forsøg** (ikke kun pr. afsluttet opgave) via events fra `PracticeSession`.
- Adaptive mode bruger IRT (`src/adaptive/irt.ts`): `theta` opdateres pr. forsøg og næste item-niveau vælges via `chooseLevelFromTheta(theta)`.
- Area model og kolonneaddition er fjernet fra UI (kan genintroduceres senere).

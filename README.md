# AI Modular Data Center (MDC) Configurator — V13 (Batch 2 Core)

Modular **Vite + React 18 + TypeScript + Tailwind CSS + PWA** rebuild of the V12.4 single-file monolith with automated GitHub Pages CI/CD and full V12 JSON/catalog backward compatibility.

## What Is Included in Batch 2
- **Automated GitHub Pages CI/CD (`.github/workflows/deploy.yml`):** Runs `tsc --noEmit`, `vitest run`, and `vite build` on every push to `main`. Failed checks block deployment so the live Pages URL never breaks.
- **Typed Engineering Engines (`src/engines/`):**
  - `civilPlinth.ts` (**Bug #4 Fix**): RCC Plinth/Raft (`1.35–1.80m`) vs automatic `4.5m` RCC Pile Cap switch when soil SBC `< 110 kPa`, imposed bearing pressure (`kN/m²`), Bearing FoS, M35 concrete/rebar BOQ, and `1:50` drainage.
  - `electricalSld.ts` (**Bug #1 Fix**): Immutable `resolveElectricalStandards()` eliminating `ReferenceError: standards is not defined` on `E-201`; sizes `33/132 kV` incomers, `K-13` AI harmonic transformers, `IP55/IP65` sandwich busducts, CPCB-IV+ DGs, modular UPS, and LFP BESS grid load-drop protection.
  - `mepCooling.ts`: Enforces **ZERO yard CDUs**, internal CDU towers, mandatory `80 kW` PACs, yard/roof adiabatic chillers, 3-zone isolation, FWS/CHW flow rates (LPM), and dynamic PUE.
  - `climateSeismic.ts`: Live **Open-Meteo ERA5** historical archive fetch + **IS 1893:2016** seismic zone lookup.
  - `supplyChain.ts` & `tcoEngine.ts`: 16 India OEM SKUs (`public/data/mdc_supply_intel.json`), PPP-MII Class-I/II scoring, Special Vendor Quotes, GST/Contingency/Margin, and 5-Year TCO.
- **Unified Storage Adapter (`src/services/storageAdapter.ts` — Bug #3 Fix):** Automatically merges stranded V11 (`ai_mdc_studio_v11_0_enterprise`) and V12 (`ai_mdc_studio_v12_0_enterprise`) keys into `ai_mdc_studio_v13_enterprise`, relaxes `schemaVersion` import gating, and resets `<input type="file">` after every import.
- **Real Google Drive Picker (`src/services/drivePicker.ts` — Bug #2 Fix):** Uses native `google.picker.DocsView(ViewId.FOLDERS)` with `setSelectFolderEnabled(true)` and `SUPPORT_DRIVES`, plus Drive v3 folder creation/save/update and explicit `DriveApiError` surfacing.
- **Optional Offline Single-File Build:** Run `npm run build:singlefile` whenever an air-gapped `.html` snapshot is needed.

## Quickstart (Local MacBook)
```bash
npm install
npm run typecheck
npm run test
npm run dev
```

## Enabling Live Google Drive Folder Picker on GitHub Pages
1. In **Google Cloud Console**, enable **Google Drive API** and **Google Picker API**.
2. Under **APIs & Services → Credentials**:
   - Add `https://<your-github-username>.github.io` (and `http://localhost:5173`) to **Authorized JavaScript origins** on your OAuth 2.0 Web Client ID.
   - Create an **API Key** restricted by HTTP referrer (`https://<your-github-username>.github.io/*`) and restricted to **Google Picker API**.
3. In your GitHub repository go to **Settings → Secrets and variables → Actions → Variables** and add:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_PICKER_API_KEY`
   - `VITE_GOOGLE_APP_ID` (your GCP numeric Project Number)
4. In **Settings → Pages**, set **Source** to **GitHub Actions**. Push to `main` to deploy.

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project

Gloup admin panel — React 19 + Vite SPA (JavaScript, no TypeScript) for administering a salon/partner booking platform. It is a pure frontend: all data comes from the Gloup backend API.

## Commands

```bash
npm run dev       # Vite dev server, host 0.0.0.0 port 5173 (pnpm run dev also works)
npm run build     # production build to dist/
npm run preview   # serve the built dist/
npm run lint      # eslint .
```

There is **no test framework configured** — no test runner, no test files, no `npm test`. Don't look for one; verification is `npm run lint` + `npm run build`, or driving the app in the browser.

`npm run lint` currently reports ~159 warnings and **0 errors**. That is the expected baseline: `eslint.config.js` deliberately downgrades legacy style debt (`no-unused-vars`, `no-undef`, `react-hooks/exhaustive-deps`) to warnings so CI passes. Only introduce zero new *errors*; don't try to clear the warning backlog wholesale.

### Package manager

Both `pnpm-lock.yaml` and `package-lock.json` are committed. The Dockerfile prefers pnpm (`pnpm install --frozen-lockfile`) when `pnpm-lock.yaml` exists; CI (`ci.yml`) uses `npm ci`. **When changing dependencies, update both lockfiles** or the deployed build and the CI build diverge.

## Environment variables

Vite bakes `VITE_*` into the JS bundle **at build time**, so changing them requires a rebuild, not a restart.

| Var | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | axios baseURL + SSE endpoint + legacy image fallback |
| `VITE_IMAGE_BASE_URL` | image host |
| `VITE_GOOGLE_MAPS_KEY` | `@react-google-maps/api` (MapPicker) |

`.env` is **never committed** and API URLs are **not branch-specific in source**. GitHub Actions writes `.env` on the target server at deploy time from `ADMIN_UAT_*` / `ADMIN_PROD_*` secrets. For local work, copy `.env.example` to `.env.local`.

## Deployment

| Branch | Workflow | Target |
| --- | --- | --- |
| PR → `master` | `ci.yml` | lint + production build only |
| push `uat` | `ci.yml` + `deploy-uat.yml` | scp to UAT VM, `docker compose up -d --build` |
| push `master` | `deploy.yml` | ssh to GCP VM `gloup`, git pull, `docker compose up -d --build`, health check on :3001 → https://admin.gloup.in |

Both deploys build a Docker image (Node build stage → nginx runner) and serve `dist/` through `nginx.conf`, which has the SPA `try_files … /index.html` fallback.

## Architecture

### Auth

Token-based, stored in `localStorage` under the key `"token"` — there is no auth reducer in the store (`authSlice.js` exists and exports `loginUser`, but is **not registered in `store.js`**; components dispatch the thunk and read `localStorage` directly).

- [utils/api.js](src/utils/api.js) — the single axios instance. A request interceptor attaches the token as the **`adminauth`** header (not `Authorization`). A response interceptor clears the token and hard-redirects to `/auth` when the API returns `error.code === "Authentication Failed"`.
- [App.jsx](src/App.jsx) — the route gate reads `localStorage.getItem("token")` synchronously and `<Navigate>`s between `/auth` and `/`.

### Routing and layout

[App.jsx](src/App.jsx) owns the chrome (Sidebar, Header, responsive/mobile state, `<Toaster>`, `<UseBookingSSE/>`) and delegates the page area to [routes/AppRoutes.jsx](src/routes/AppRoutes.jsx), where every page is `React.lazy`-imported behind one `<Suspense>`.

**Adding a page takes two edits**: a `<Route>` in [AppRoutes.jsx](src/routes/AppRoutes.jsx) and an entry in the `menuItems` array in [components/layout/Sidebar.jsx](src/components/layout/Sidebar.jsx). Pages receive their heading via a `title` prop from the route element.

### Redux

~24 domain slices in [redux/slices/](src/redux/slices/), all registered in [redux/store.js](src/redux/store.js). Every slice follows the same shape:

- `createAsyncThunk` per operation, calling the shared `api` instance.
- State `{ loading, error, success, <domainList> }` with `pending`/`fulfilled`/`rejected` cases in `extraReducers`.
- Errors normalized with `error.response?.data?.error?.message || error.message || "<fallback>"` and returned via `rejectWithValue`.
- A `reset<Domain>State` reducer.

Copy an existing slice (e.g. [categorySlice.js](src/redux/slices/categorySlice.js)) when adding one — consistency here matters more than improving the pattern in one place.

`redux-persist` is wired up but its `whitelist: ["class", "student"]` names slices that don't exist, so **nothing is actually persisted**. `serializableCheck` is disabled store-wide.

### API call conventions

Nearly every call is `api.post("/admin/app/...")` — including reads and deletes (110 POSTs vs 3 GETs). Most calls pass `withCredentials: false` per-call, overriding the instance's `withCredentials: true`. Follow the surrounding code rather than "correcting" the verb.

### Page composition pattern

A domain page is three files:

- `components/data/<Domain>.jsx` — container: dispatches thunks, holds `formData` + an `activeTab` (`"table"` | `"form"`) toggle, and passes handlers down.
- `components/table/<Domain>Table.jsx` — list rendering, search/filter/sort/pagination, CSV export.
- `components/form/<Domain>Form.jsx` — create/edit form.

[Category.jsx](src/components/data/Category.jsx) is a good reference. Mutations that involve images build a `FormData` and re-dispatch the list thunk on success.

> **`components/data/DataPage.jsx`, `DataTable.jsx`, and `DataForm.jsx` are dead scaffolding** from the Vite template era — hardcoded sample data, imported by nothing. Don't use them as a reference or extend them.

Detail pages live in `components/details/`, multi-step creation flows in `components/create/`.

### Shared helpers

- [hooks/useListUiState.js](src/hooks/useListUiState.js) — drop-in replacement for a cluster of `useState` list fields (page, search, filters, sort, view type), persisted in the `listUiState` Redux slice under a string key so the list survives navigating to a detail page and back. Used by [PartnerTable.jsx](src/components/table/PartnerTable.jsx) and [UsersV2.jsx](src/components/data/UsersV2.jsx); prefer it for new list pages.
- [utils/format.js](src/utils/format.js) — `titleCase`, `pick` (first non-empty of several keys), `toDate` (moment or null), `rupees`, `downloadCsv`.
- [utils/userModel.js](src/utils/userModel.js) — pure mappers from the admin user APIs to what the V2 user pages render (`normalizeUser`, `buildUserProfile`, `spendSeries`). Its header lists which fields are confirmed against V1 and which `pick()` lists are still guesses.
- [utils/image.js](src/utils/image.js) — `getImageUrl()` resolves the several path shapes left over from the GCS migration (absolute URLs, `/store|/category|/banner` → `storage.googleapis.com/gloup-images`, legacy `/upload` → API base). Always route DB image paths through it.
- [utils/loyalty.js](src/utils/loyalty.js) — `LOYALTY_TIERS` and label formatters mirroring the backend's `loyalty_status` values.
- [utils/toast.js](src/utils/toast.js) — `showToast(id, …)` exists but almost nothing uses it; the de-facto convention is importing `toast` from `react-hot-toast` directly and passing a stable string `id` per action (e.g. `"addcategory-toast"`) so repeated submits replace rather than stack.
- [utils/googleMaps.js](src/utils/googleMaps.js) — `GOOGLE_MAPS_LOADER`, the one options object every `useLoadScript()` call must pass ([MapPicker.jsx](src/components/create/MapPicker.jsx) and the Deep User Insights and Salon Heatmap maps all do). The loader re-injects the Maps script, and warns, whenever the options differ from what is already on the page, so never inline your own `{ googleMapsApiKey, libraries }`. Use the functional `CircleF` / `OverlayViewF` / `MarkerF` variants: `main.jsx` runs `StrictMode`.

### V2 pages ("New Pages" in the sidebar)

Redesigned pages built 1:1 from approved mockups, living alongside the V1 pages under `*-v2` routes. 20 of the 22 still render **static demo data** declared at the top of each file (only UsersV2 and UserDetailsV2 call the API; the Deep User Insights and Salon Heatmap maps are real Google Maps, but the hotspots drawn on them are demo data); each file's header comment names the slice and live page to wire it to, or says no endpoint exists yet (the eleven analytics pages in `components/analytics/` and `components/dashboard/GrowthDashboardV2.jsx`: User Analytics, User Analytics Overview, User Analytics 360°, Deep User Insights, Growth Dashboard, Click & Interaction, Service Intelligence, Behavior Analytics, Salon Heatmap, Booking Intelligence, Salon Category Intelligence). Partner Details V2 (`components/details/PartnerDetailsV2.jsx`, `/partner-details-v2`) is static too: it shows the same demo salon whatever the URL and points at the live `PartnerDetails.jsx` in its header. Note two mockups are both titled "User Analytics" (the "Dashboard" and the "Overview" one): the sidebar labels tell them apart.

- **Layout**: every V2 page wraps its content in [v2/ScaledCanvas.jsx](src/components/v2/ScaledCanvas.jsx) — a fixed design-width canvas uniformly scaled to the available width. Consequence: raising a page's px sizes (its `T` type-scale map) makes text *smaller* on screen, not bigger. Anything `position: fixed` (modals) must render outside `ScaledCanvas`, because a transformed ancestor traps fixed descendants.
- **Line height**: `index.css` gives `<body>` a fixed `line-height: 24px`, and arbitrary sizes like `text-[11px]` don't override it, so small text gets a 24px line box and rows/cards come out far taller than the mockup. Put `leading-snug` on the page's `ScaledCanvas` (the analytics pages and Partner Details V2 do), `leading-none` where a row must hug its cells (`HeatGrid` labels), and give a `<td>` that holds an inline element its own `text-[…]` class — a 16px strut inflates the row.
- **Third-party widgets that read the pointer** (maps) go inside `<Unscaled>` (exported from ScaledCanvas.jsx; it fills its positioned parent). Under the canvas's `transform: scale(s)` Google Maps pans by `s×` the cursor's travel and zooms about the wrong point; `<Unscaled>` lays the widget out at true screen pixels instead. `useCanvasScale()` ([v2/canvasScaleContext.js](src/components/v2/canvasScaleContext.js)) returns `s` for sizing overlays to match the canvas type. Google's logo and attribution are drawn at true screen size, so a legend or zoom control laid over the map in canvas space must clear them by a fixed number of screen pixels (`bottom: Math.ceil(36 / s)`), not a fixed canvas offset.
- **App-bar content**: pages render their title / search / bell into Header.jsx through `<PageHeaderPortal>` ([layout/PageHeaderSlot.jsx](src/components/layout/PageHeaderSlot.jsx)); the provider wraps the layout in App.jsx. Don't draw a second header row inside the canvas.
- **Shared kit**: [v2/ui.jsx](src/components/v2/ui.jsx) — `Card`, `SectionTitle`, `CardHeader`, `Chip`, `Select`, `SalonLogo`; metrics and charts: `KpiTile` (optional sparkline or `footer`), `Delta`, `Sparkline`, `Meter`, `Donut`, `HeatGrid` (labels on top or `labelsAt="bottom"`; blank labels allowed, so a 24-column grid can name every fourth) / `RampLegend`, `LegendDot`; controls and tiles: `Segmented` (Men's / Women's / All, % / Count), `InsightTile`; app bar: `HeaderBell`, `HeaderSearch`, `HeaderSelect`, `HeaderButton`, `LiveStamp` — and [v2/tokens.js](src/components/v2/tokens.js) (`CARD`, `CHART_AXIS`, `CHART_TOOLTIP`, `initials`, `toSpark`, `rampColor`). Components take the size class from the page's own `T` map; a page whose variant differs wraps the shared one (`const Chip = (p) => <BaseChip size=… {...p} />`) rather than copying it. `Delta` colours by meaning, not direction (`good`), because the mockups do (a falling rage-click count is drawn red).
- **Placeholders kept on purpose**: the notification bell counts, ⌘K hints and "Live Data · Updated" stamps are static mockup values with no backend behind them; the design deliberately keeps them.

### Real-time

[components/data/UseBookingSSE.jsx](src/components/data/UseBookingSSE.jsx) is mounted once in the layout (despite the `Use*` name it is a rendered component, not a hook). It opens an `EventSource` to `/admin/app/bookings/sse` with the token as a **query param** (EventSource can't set headers), reconnects every 5s on error, and handles two event types: `LIVE_STATS` (dispatched into `dashboardSlice`) and `NEW_BOOKING` (browser Notification + toast). Notification permission is requested on mount in `App.jsx`.

### Styling

Tailwind CSS v4 via the `@tailwindcss/vite` plugin — **no `tailwind.config.js` and no `postcss.config.js`**. Everything is `@import "tailwindcss"` plus CSS custom properties in [index.css](src/index.css). Styling is inline utility classes; `App.css` is empty.

Charts use `recharts`, icons come from both `lucide-react` and `react-icons`, and dates from both `moment` and `date-fns` — match whatever the file already imports.

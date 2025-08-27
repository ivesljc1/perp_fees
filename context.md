Perpetual Fee Competitive Landscape – Requirements

Goal: Build an interactive Next.js visualization that compares maker and taker fee tiers for perpetual futures across major CEXes and DEXes, using a step‑point schema only. Output must be production‑lean, accessible, and driven entirely by a JSON dataset (no hardcoded fees).

⸻

Competitors (Scope)
•	CEXes: Bybit, Binance, Kraken, OKX, Coinbase
•	DEXes: Hyperliquid, EdgeX, Jupiter, Drift, ApeX Protocol, Aster, GMX, Vertex, ParaDex

Units: All fees in bps (basis points). Maker fees can be negative (rebates) — charts must support values below 0.

Product: Perpetual futures only. Funding/borrow/price‑impact fees are out of scope for the base comparison.

⸻

Deliverables (Tech Stack)
•	Framework: Next.js (App Router) + React + TypeScript
•	Styling: TailwindCSS (and optional shadcn/ui for controls/panels)
•	Charts: Recharts or Visx, with custom tooltip, custom ticks, and step‑line rendering
•	Data: Static JSON at public/dataset.json (validated at runtime). No hardcoded fee values in code.

⸻

Data Schema (Step‑Point Only)

{
"exchange": "Binance",
"type": "CEX",
"product": "perp",
"day_basis": 14,
"maker_fees": [
{ "volume": 0, "fee": 1.5 },
{ "volume": 5000000, "fee": 1.2 },
{ "volume": 25000000, "fee": 0.8 },
{ "volume": 100000000, "fee": 0.4 },
{ "volume": 500000000, "fee": 0.0 },
{ "volume": 2000000000, "fee": 0.0 },
{ "volume": 7000000000, "fee": 0.0 }
],
"taker_fees": [
{ "volume": 0, "fee": 4.5 },
{ "volume": 5000000, "fee": 4.0 },
{ "volume": 25000000, "fee": 3.5 },
{ "volume": 100000000, "fee": 3.0 },
{ "volume": 500000000, "fee": 2.8 },
{ "volume": 2000000000, "fee": 2.6 },
{ "volume": 7000000000, "fee": 2.4 }
]
}

Rules:
•	day_basis field required (integer, e.g., 7, 14, 30).
•	maker_fees and taker_fees are arrays of { volume, fee } where volume is the minimum 30D (or N‑day) volume USD.
•	Fee schedule is piecewise‑constant: fee applies until next volume point.
•	Final point extends to Infinity.

⸻

Charts (2) — Synchronized, Stepped
•	Chart A: Maker Fee vs Adjusted Volume (bps) — stepped line(s)
•	Chart B: Taker Fee vs Adjusted Volume (bps) — stepped line(s)
•	Zero baseline: Always render horizontal line at 0 bps.
•	Markers: Only at step cutoffs (tier boundary volumes).
•	Strict step lines: No smoothing/interpolation.

⸻

Axes & Ticks (Dynamic)
•	Dynamic domains:
•	X (volume): [min volume, max volume] among selected venues, with ~2% padding.
•	Y (bps): [min fee, max fee] among selected venues (maker/taker), include negatives.
•	Tick policy (X‑axis):
•	Minor tick: every $1,000,000 (no labels).
•	Major tick: every $10,000,000 (labels: $10M, $20M, …).
•	Hover granularity: Hover snaps to every $1M tick, not just to step points.

⸻

Hover, Tooltip & Ranking
•	Shared crosshair: Hovering either chart → vertical crosshair snapped to nearest $1M tick (syncs across both charts).
•	Ranking panel:
•	At hover volume, lookup maker/taker fees for each venue.
•	Rank cheapest → most expensive by current chart’s fee type.
•	Tie‑breakers: other fee, then exchange name.
•	Show: venue, type (CEX/DEX), maker fee, taker fee, and rebate badge if maker < 0.

⸻

Controls
•	Exchange selector: Multi‑select venues; quick toggles for CEX/DEX.
•	Day basis toggle:
•	If 30 day is on, normalize all schedules to 30‑day basis:
•	If venue has day_basis = 30 → keep it the same
•	If venue has day_basis = 14 → multiply all volumes by 2.
•	If venue has day_basis = 7 → multiply all volumes by 4.
•	If 14 day is on, normalize all schedules to 14‑day basis:
•	If venue has day_basis = 14 → keep it the same
•	If venue has day_basis = 30 → divide all volumes by 2.
•	If venue has day_basis = 7 → multiply all volumes by 2.
•	Other toggles: Linear/Log X‑axis (default Linear).
•	URL sync: Persist exchange selection + day basis toggle in query string.

⸻

Interaction & Computation
•	Tier lookup: For tick volume V, pick the last { volume } less than or equal to V; fee = that step’s fee.
•	Snap‑to‑tick: Compute nearest $1M tick; crosshair snaps there.
•	Markers: Dots only at fee change volumes.
•	Normalization: Apply day_basis adjustment before domain computation and chart render when toggle is on.
•	Performance: Precompute { tick → fee } tables post‑normalization for each venue.

⸻

Layout & A11y
•	Desktop: Two stacked charts, rank panel on right, selector/legend on left.
•	A11y: Keyboard controls; high contrast; color‑blind‑safe palette; numeric values in tooltip (not color‑only).

⸻

Next.js Integration
•	Route: /fees
•	Server component loads dataset.json, validates schema, applies normalization logic if toggle is on.
•	Client components:
•	<FeeChart type="maker"|"taker" />
•	<Controls /> (exchanges + day basis toggle + log/linear toggle)
•	<RankPanel />
•	<Legend />

⸻

Acceptance Criteria
•	✅ Charts render stepped lines for all selected venues using step‑point schema.
•	✅ Hover snaps to every $1M tick; crosshair + ranking panel update accordingly.
•	✅ Normalization toggle works:
•	30→14 days = divide volumes by 2.
•	7→14 days = multiply volumes by 2.
•	✅ Ranking sorts correctly; rebate badge displays when maker < 0.
•	✅ Dynamic domains reflect only selected venues (after normalization).
•	✅ Minor ticks ($1M) unlabeled; major ticks ($10M) labeled.
•	✅ No fee values hardcoded; everything read from dataset.json.
•	✅ Responsive + accessible on desktop & mobile.

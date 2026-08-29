# Israeli Sphere Finance

A fully local, offline personal-finance dashboard for the Israeli financial
sphere: bank accounts, credit cards, brokerage/stocks, RSUs, pension funds
(קרן פנסיה), provident funds (קופת גמל), study funds (קרן השתלמות) and
managers' insurance (ביטוח מנהלים).

**Nothing in this app talks to a network.** There is no backend, no
analytics, no external API calls. All data you enter is stored only in your
browser's `localStorage`, on your own machine.

## Why manual import, not direct bank connections

Israel doesn't yet have a broadly usable consumer Open Banking API for most
retail banks. The realistic "direct connect" option is community screen-scraping
tools (e.g. `israeli-bank-scrapers`) that log in with your real bank password.
This v1 deliberately avoids that: you export/copy balances yourself from each
institution's app or statement, so no credentials are ever stored or
transmitted by this tool. A scraper-based connector could be added later as
an explicit, opt-in module — kept separate from this core so the trust
boundary stays clear.

## Running it

No build step, no dependencies. Just open `index.html` in a browser, or serve
it locally:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Using it

1. **Profile** — optionally enter your birth year and monthly expenses. Used
   only to tailor suggestions (age-based allocation, emergency-fund check).
2. **Add an account** — one row per account: bank checking, credit card,
   brokerage, RSU/ESPP, pension, provident fund, study fund, or managers'
   insurance. For the retirement-type accounts you can record the deposit
   fee % (דמי ניהול מהפקדה) and annual asset fee % (דמי ניהול מצבירה) that
   appear on your annual statement (דוח שנתי) — these drive the fee warnings.
3. **CSV import** — for importing several accounts at once. Header:
   `name,type,currency,balance,depositFeePct,assetFeePct,equityPct`. See
   `data/sample-import.csv` for a template and valid `type` values (matches
   the dropdown in the Add Account form: `bank_checking`, `savings_deposit`,
   `credit_card`, `brokerage`, `rsu`, `pension`, `gemel`, `hishtalmut`,
   `insurance_manager`, `other`).
4. **Suggestions** — a small rule-based engine flags things like: high
   pension/gemel fees, multiple small retirement accounts worth consolidating
   (מיזוג קופות), concentrated employer-stock exposure, a thin or oversized
   emergency fund, and an equity allocation that looks far off a simple
   age-based rule of thumb. These are heuristics to prompt a closer look, not
   financial advice.
5. **Backup** — since data lives only in this browser, use "Export backup"
   periodically (a local `.json` file you keep yourself) and "Restore from
   backup" to reload it, including in a different browser/machine.

## Known limitations (v1)

- No multi-currency conversion — non-ILS balances are tracked at face value;
  convert manually if you want a single blended net-worth figure.
- No historical tracking / trend charts — this is a snapshot dashboard.
- Fee and allocation thresholds in the suggestions engine are fixed
  heuristics (see `js/insights.js`) — adjust them there if your own comfort
  levels differ.

## Roadmap ideas

- Optional `israeli-bank-scrapers`-based connector module (opt-in, local-only,
  credentials never leave your machine) for automatic refresh.
- Historical snapshots with a net-worth-over-time chart.
- FX conversion using a rate you supply.

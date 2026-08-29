// Rule-based optimization suggestions. Everything here is a heuristic, not
// financial advice — thresholds are deliberately conservative and explained
// in the suggestion text so the user can judge for themselves.

function computeInsights(state) {
  const { accounts, profile } = state;
  const insights = [];

  const totals = computeBucketTotals(accounts);
  const netWorth = totals.cash + totals.investments + totals.equity_comp + totals.retirement - totals.debt;

  // 1. High fees on pension/gemel/hishtalmut/insurance products.
  accounts.filter((a) => FEE_BEARING_TYPES.has(a.type)).forEach((a) => {
    const depositFee = Number(a.depositFeePct) || 0;
    const assetFee = Number(a.assetFeePct) || 0;
    if (depositFee > 1.0 || assetFee > 0.9) {
      insights.push({
        severity: "warning",
        title: `High fees on ${a.name || ACCOUNT_TYPES[a.type].label}`,
        body: `Deposit fee ${depositFee}% / annual asset fee ${assetFee}% looks above what's typically negotiable. ` +
              `Compare against current market rates on the Israeli Ministry of Finance's fee-comparison tool ` +
              `(fees.gov.il) and consider calling the provider to negotiate, or transferring (ניוד) to a cheaper fund.`,
      });
    }
  });

  // 2. Multiple small retirement accounts — consolidation candidate.
  const retirementAccounts = accounts.filter((a) => ACCOUNT_TYPES[a.type]?.bucket === "retirement");
  if (retirementAccounts.length >= 3) {
    insights.push({
      severity: "info",
      title: "Multiple pension/provident-fund accounts",
      body: `You have ${retirementAccounts.length} retirement-type accounts, often left over from past employers. ` +
            `Consolidating (מיזוג קופות) can reduce total fees and administrative overhead — check each fund's ` +
            `exit terms and any employer-match conditions before merging.`,
    });
  }

  // 3. Employer stock / RSU concentration risk.
  const equityCompTotal = accounts.filter((a) => ACCOUNT_TYPES[a.type]?.bucket === "equity_comp")
    .reduce((sum, a) => sum + toILS(a), 0);
  if (netWorth > 0 && equityCompTotal / netWorth > 0.15) {
    const pct = Math.round((equityCompTotal / netWorth) * 100);
    insights.push({
      severity: "warning",
      title: "Concentrated exposure to employer stock",
      body: `Unvested/vested employer equity is about ${pct}% of your net worth. A common rule of thumb is to keep ` +
            `single-employer exposure under ~10-15% of net worth, since your salary is already tied to the same company. ` +
            `Consider selling vested shares on a schedule and reinvesting into a diversified portfolio.`,
    });
  }

  // 4. Emergency fund vs monthly expenses.
  const cashTotal = accounts.filter((a) => ACCOUNT_TYPES[a.type]?.bucket === "cash")
    .reduce((sum, a) => sum + toILS(a), 0);
  if (profile.monthlyExpenses) {
    const months = cashTotal / profile.monthlyExpenses;
    if (months < 3) {
      insights.push({
        severity: "danger",
        title: "Emergency fund below 3 months",
        body: `Cash & deposits cover about ${months.toFixed(1)} months of expenses. A common target is 3-6 months ` +
              `of essential spending kept liquid before investing further.`,
      });
    } else if (months > 9) {
      insights.push({
        severity: "info",
        title: "Large idle cash balance",
        body: `Cash & deposits cover about ${months.toFixed(1)} months of expenses — well above a typical 3-6 month ` +
              `buffer. Cash sitting in a low/no-interest checking account loses value to inflation; consider moving ` +
              `the excess into a short-term deposit, money-market fund (קרן כספית), or your investment account.`,
      });
    }
  }

  // 5. Age-based asset-allocation sanity check.
  if (profile.birthYear) {
    const age = new Date().getFullYear() - profile.birthYear;
    const targetEquityPct = Math.max(20, Math.min(90, 110 - age));
    const investable = accounts.filter((a) =>
      ["investments", "retirement", "equity_comp"].includes(ACCOUNT_TYPES[a.type]?.bucket));
    let equitySum = 0, totalSum = 0;
    investable.forEach((a) => {
      const bal = toILS(a);
      totalSum += bal;
      const eqPct = a.equityPct != null && a.equityPct !== "" ? Number(a.equityPct) : 100;
      equitySum += bal * (eqPct / 100);
    });
    if (totalSum > 0) {
      const actualEquityPct = Math.round((equitySum / totalSum) * 100);
      if (Math.abs(actualEquityPct - targetEquityPct) > 20) {
        insights.push({
          severity: "info",
          title: "Asset allocation may be off-target for your age",
          body: `Estimated equity allocation across investments/retirement accounts is ~${actualEquityPct}%. A common ` +
                `age-based rule of thumb (110 minus age) suggests around ${targetEquityPct}% equity. This is a rough ` +
                `heuristic, not a target — but a large gap is worth a deliberate decision rather than an accident of ` +
                `which funds you happened to join.`,
        });
      }
    }
  }

  // 6. Credit card balance carried as debt.
  const debtTotal = accounts.filter((a) => ACCOUNT_TYPES[a.type]?.bucket === "debt")
    .reduce((sum, a) => sum + toILS(a), 0);
  if (debtTotal > 0) {
    insights.push({
      severity: "warning",
      title: "Outstanding credit card balance",
      body: `You're carrying ₪${formatNumber(debtTotal)} in credit card debt. In Israel, standard "תשלומים" ` +
            `installment plans are usually interest-free, but revolving/"אשראי מתגלגל" balances carry high interest — ` +
            `worth confirming which kind this is.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      severity: "info",
      title: "No flags from the current rules",
      body: "Add fee rates, allocation breakdowns, and your profile (age, monthly expenses) above for more tailored suggestions.",
    });
  }

  return insights;
}

function computeBucketTotals(accounts) {
  const totals = { cash: 0, investments: 0, equity_comp: 0, retirement: 0, debt: 0 };
  accounts.forEach((a) => {
    const bucket = ACCOUNT_TYPES[a.type]?.bucket || "cash";
    totals[bucket] += toILS(a);
  });
  return totals;
}

// FX is out of scope for v1 — non-ILS balances are shown in their own
// currency, but for aggregate totals we treat the numeric value as-is and
// label it clearly in the UI. Users mixing currencies should convert
// manually until FX support is added.
function toILS(account) {
  return Number(account.balance) || 0;
}

function formatNumber(n) {
  return Math.round(n).toLocaleString("en-US");
}

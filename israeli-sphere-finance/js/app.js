let state = loadState();

function persist() {
  saveState(state);
  render();
}

function render() {
  renderProfile();
  renderOverview();
  renderAccountsTable();
  renderInsights();
  renderTypeOptions();
}

// ---- Profile ----

function renderProfile() {
  document.getElementById("birthYear").value = state.profile.birthYear ?? "";
  document.getElementById("monthlyExpenses").value = state.profile.monthlyExpenses ?? "";
}

function onProfileChange() {
  state.profile.birthYear = Number(document.getElementById("birthYear").value) || null;
  state.profile.monthlyExpenses = Number(document.getElementById("monthlyExpenses").value) || null;
  persist();
}

// ---- Overview ----

function renderOverview() {
  const totals = computeBucketTotals(state.accounts);
  const netWorth = totals.cash + totals.investments + totals.equity_comp + totals.retirement - totals.debt;

  document.getElementById("netWorthValue").textContent = `₪${formatNumber(netWorth)}`;

  const barsEl = document.getElementById("bucketBars");
  barsEl.innerHTML = "";
  const maxVal = Math.max(1, ...Object.keys(BUCKET_LABELS).map((k) => totals[k] || 0));

  Object.keys(BUCKET_LABELS).forEach((bucket) => {
    const val = totals[bucket] || 0;
    const pct = Math.max(2, (val / maxVal) * 100);
    const row = document.createElement("div");
    row.className = "bucket-row";
    row.innerHTML = `
      <div class="bucket-label">${BUCKET_LABELS[bucket]}</div>
      <div class="bucket-track">
        <div class="bucket-fill" style="width:${pct}%;background:${BUCKET_COLORS[bucket]}"></div>
      </div>
      <div class="bucket-value">₪${formatNumber(val)}</div>
    `;
    barsEl.appendChild(row);
  });
}

// ---- Accounts table ----

function renderTypeOptions() {
  const sel = document.getElementById("newType");
  if (sel.options.length > 0) return;
  Object.entries(ACCOUNT_TYPES).forEach(([key, def]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = def.label;
    sel.appendChild(opt);
  });
}

function renderAccountsTable() {
  const tbody = document.getElementById("accountsBody");
  tbody.innerHTML = "";
  state.accounts.forEach((a) => {
    const tr = document.createElement("tr");
    const feeCols = FEE_BEARING_TYPES.has(a.type)
      ? `${a.depositFeePct || 0}% / ${a.assetFeePct || 0}%`
      : "—";
    tr.innerHTML = `
      <td>${escapeHtml(a.name || "")}</td>
      <td>${ACCOUNT_TYPES[a.type]?.label || a.type}</td>
      <td>${escapeHtml(a.currency || "ILS")}</td>
      <td class="num">${formatNumber(Number(a.balance) || 0)}</td>
      <td>${feeCols}</td>
      <td><button class="btn-link" data-action="delete" data-id="${a.id}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.accounts = state.accounts.filter((a) => a.id !== btn.dataset.id);
      persist();
    });
  });
}

function addAccountFromForm() {
  const type = document.getElementById("newType").value;
  const name = document.getElementById("newName").value.trim();
  const currency = document.getElementById("newCurrency").value.trim() || "ILS";
  const balance = Number(document.getElementById("newBalance").value) || 0;
  const depositFeePct = Number(document.getElementById("newDepositFee").value) || 0;
  const assetFeePct = Number(document.getElementById("newAssetFee").value) || 0;
  const equityPct = document.getElementById("newEquityPct").value;

  if (!name) { alert("Please give the account a name/institution."); return; }

  state.accounts.push({
    id: crypto.randomUUID(),
    type, name, currency, balance,
    depositFeePct, assetFeePct,
    equityPct: equityPct === "" ? null : Number(equityPct),
  });

  document.getElementById("newName").value = "";
  document.getElementById("newBalance").value = "";
  document.getElementById("newDepositFee").value = "";
  document.getElementById("newAssetFee").value = "";
  document.getElementById("newEquityPct").value = "";

  persist();
}

// ---- CSV import ----
// Expected header (case-insensitive), one row per account:
// name,type,currency,balance,depositFeePct,assetFeePct,equityPct
// `type` must match one of the ACCOUNT_TYPES keys (see README for the list).

function handleCSVFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    const objs = rowsToObjects(rows);
    let imported = 0;
    const errors = [];

    objs.forEach((o, idx) => {
      const type = (o.type || "").trim();
      if (!ACCOUNT_TYPES[type]) {
        errors.push(`Row ${idx + 2}: unknown type "${o.type}"`);
        return;
      }
      state.accounts.push({
        id: crypto.randomUUID(),
        type,
        name: o.name || "",
        currency: o.currency || "ILS",
        balance: Number(o.balance) || 0,
        depositFeePct: Number(o.depositfeepct) || 0,
        assetFeePct: Number(o.assetfeepct) || 0,
        equityPct: o.equitypct ? Number(o.equitypct) : null,
      });
      imported++;
    });

    persist();

    const statusEl = document.getElementById("importStatus");
    statusEl.textContent = errors.length
      ? `Imported ${imported} account(s). ${errors.length} row(s) skipped: ${errors.join("; ")}`
      : `Imported ${imported} account(s) successfully.`;
  };
  reader.readAsText(file);
}

// ---- Insights ----

function renderInsights() {
  const list = document.getElementById("insightsList");
  list.innerHTML = "";
  computeInsights(state).forEach((ins) => {
    const div = document.createElement("div");
    div.className = `insight insight-${ins.severity}`;
    div.innerHTML = `<h3>${escapeHtml(ins.title)}</h3><p>${escapeHtml(ins.body)}</p>`;
    list.appendChild(div);
  });
}

// ---- Backup / restore ----

function handleBackupFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.accounts) throw new Error("Missing accounts array");
      state = { ...defaultState(), ...parsed };
      persist();
      document.getElementById("importStatus").textContent = "Backup restored.";
    } catch (e) {
      alert("Could not read backup file: " + e.message);
    }
  };
  reader.readAsText(file);
}

// ---- Utilities ----

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Wiring ----

document.addEventListener("DOMContentLoaded", () => {
  render();

  document.getElementById("birthYear").addEventListener("change", onProfileChange);
  document.getElementById("monthlyExpenses").addEventListener("change", onProfileChange);
  document.getElementById("addAccountBtn").addEventListener("click", addAccountFromForm);

  document.getElementById("csvInput").addEventListener("change", (e) => {
    if (e.target.files[0]) handleCSVFile(e.target.files[0]);
    e.target.value = "";
  });

  document.getElementById("exportBtn").addEventListener("click", () => exportStateAsFile(state));

  document.getElementById("backupInput").addEventListener("change", (e) => {
    if (e.target.files[0]) handleBackupFile(e.target.files[0]);
    e.target.value = "";
  });

  document.getElementById("newType").addEventListener("change", () => {
    const type = document.getElementById("newType").value;
    document.getElementById("feeFields").style.display = FEE_BEARING_TYPES.has(type) ? "flex" : "none";
  });
});

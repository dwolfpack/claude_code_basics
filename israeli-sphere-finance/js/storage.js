// All persistence is local to this browser via localStorage. Nothing is
// ever sent over the network — there is no server side to this app.

const STORAGE_KEY = "isf.state.v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch (e) {
    console.error("Failed to load saved data, starting fresh.", e);
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultState() {
  return {
    accounts: [],
    profile: {
      birthYear: null,
      monthlyExpenses: null,
    },
  };
}

function exportStateAsFile(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `israeli-sphere-finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

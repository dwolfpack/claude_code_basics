// Account type definitions for the Israeli personal-finance sphere.
// Each type maps to a net-worth "bucket" used for the overview chart.

const ACCOUNT_TYPES = {
  bank_checking:    { label: "Checking (עו״ש)",              bucket: "cash",       group: "Bank" },
  savings_deposit:  { label: "Deposit / Savings Plan (פיקדון)", bucket: "cash",     group: "Bank" },
  credit_card:      { label: "Credit Card Balance (כרטיס אשראי)", bucket: "debt",   group: "Bank" },
  brokerage:        { label: "Brokerage / Stocks (תיק השקעות)", bucket: "investments", group: "Investments" },
  rsu:              { label: "RSU / ESPP (מניות חסומות)",     bucket: "equity_comp", group: "Investments" },
  pension:          { label: "Pension Fund (קרן פנסיה)",      bucket: "retirement", group: "Retirement" },
  gemel:            { label: "Provident Fund (קופת גמל)",     bucket: "retirement", group: "Retirement" },
  hishtalmut:       { label: "Study Fund (קרן השתלמות)",      bucket: "retirement", group: "Retirement" },
  insurance_manager:{ label: "Managers' Insurance (ביטוח מנהלים)", bucket: "retirement", group: "Retirement" },
  other:            { label: "Other",                          bucket: "cash",       group: "Other" },
};

const BUCKET_LABELS = {
  cash: "Cash & Deposits",
  investments: "Investments",
  equity_comp: "Employer Equity",
  retirement: "Pension & Insurance",
  debt: "Debt",
};

const BUCKET_COLORS = {
  cash: "#3b9dd8",
  investments: "#4fb477",
  equity_comp: "#e0a83e",
  retirement: "#8d6ecf",
  debt: "#d9534f",
};

// Account types where management fees are meaningful and worth tracking/flagging.
const FEE_BEARING_TYPES = new Set(["pension", "gemel", "hishtalmut", "insurance_manager"]);

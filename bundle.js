const STORAGE_KEY = "pgf_budgeting_complete_v1";

const initialData = {
  settings: {
    month: new Date().toISOString().slice(0, 7),
    safetyBuffer: 500
  },
  accounts: [
    { id: uid(), name: "Conto 1", type: "conto", balance: 12000 },
    { id: uid(), name: "Conto 2", type: "conto", balance: 5000 },
    { id: uid(), name: "Carta 1", type: "carta", balance: -800 }
  ],
  incomes: [
    { id: uid(), name: "Stipendio", type: "fissa", amount: 1800 },
    { id: uid(), name: "Commissioni medie", type: "variabile", amount: 4000 }
  ],
  fixedExpenses: [
    { id: uid(), name: "Affitto", amount: 1200 },
    { id: uid(), name: "Abbonamenti", amount: 80 }
  ],
  goals: [
    { id: uid(), name: "Risparmio mensile", amount: 1200 }
  ],
  investments: [
    { id: uid(), name: "ETF", saved: 6000, target: 15000, monthly: 300 },
    { id: uid(), name: "Ristrutturazione casa", saved: 8000, target: 30000, monthly: 700 }
  ],
  transactions: []
};

let state = load();
let tab = "dashboard";

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialData;
  } catch (_) {
    return initialData;
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function euro(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(v || 0));
}

function sums() {
  const liquid = state.accounts.filter(a => a.type === "conto").reduce((s, a) => s + Number(a.balance), 0);
  const cardsDebt = state.accounts.filter(a => a.type === "carta").reduce((s, a) => s + Math.abs(Math.min(0, Number(a.balance))), 0);
  const fixedIncome = state.incomes.filter(i => i.type === "fissa").reduce((s, i) => s + Number(i.amount), 0);
  const variableIncome = state.incomes.filter(i => i.type === "variabile").reduce((s, i) => s + Number(i.amount), 0);
  const fixedCost = state.fixedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const goalsCost = state.goals.reduce((s, g) => s + Number(g.amount), 0);
  const investCost = state.investments.reduce((s, i) => s + Number(i.monthly), 0);
  const monthSpend = state.transactions
    .filter(t => t.date.startsWith(state.settings.month))
    .reduce((s, t) => s + Number(t.amount), 0);

  const nextMonthBudget = liquid + fixedIncome + variableIncome - fixedCost - cardsDebt - goalsCost - investCost;
  const variableAllowed = nextMonthBudget - Number(state.settings.safetyBuffer);

  return {
    liquid,
    cardsDebt,
    fixedIncome,
    variableIncome,
    fixedCost,
    goalsCost,
    investCost,
    monthSpend,
    nextMonthBudget,
    variableAllowed
  };
}

function app() {
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="app">
      <h1>PGF Budgeting</h1>
      <p class="sub">Budget personale completo: conti, carte, spese, obiettivi, investimenti e forecast</p>
      <div class="tabs">
        ${tabBtn("dashboard", "Dashboard")}
        ${tabBtn("movimenti", "Spese giornaliere")}
        ${tabBtn("conti", "Conti e carte")}
        ${tabBtn("entrate", "Entrate")}
        ${tabBtn("fisse", "Spese fisse")}
        ${tabBtn("obiettivi", "Obiettivi")}
        ${tabBtn("investimenti", "Investimenti")}
      </div>
      <div id="view"></div>
    </div>
  `;
  renderView();
  bindTabEvents();
}

function tabBtn(id, label) {
  return `<button class="tab ${tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`;
}

function metric(label, value, tone = "") {
  return `<div class="card"><div class="label">${label}</div><div class="value ${tone}">${value}</div></div>`;
}

function renderView() {
  const view = document.getElementById("view");
  if (tab === "dashboard") view.innerHTML = dashboard();
  if (tab === "movimenti") view.innerHTML = movimenti();
  if (tab === "conti") view.innerHTML = conti();
  if (tab === "entrate") view.innerHTML = entrate();
  if (tab === "fisse") view.innerHTML = fisse();
  if (tab === "obiettivi") view.innerHTML = obiettivi();
  if (tab === "investimenti") view.innerHTML = investimenti();
  bindFormEvents();
}

function dashboard() {
  const t = sums();
  return `
    <div class="cards">
      ${metric("Liquidita conti", euro(t.liquid), "good")}
      ${metric("Debito carte", euro(t.cardsDebt), "warn")}
      ${metric("Entrate fisse", euro(t.fixedIncome))}
      ${metric("Entrate variabili attese", euro(t.variableIncome))}
      ${metric("Spese fisse mese", euro(t.fixedCost))}
      ${metric("Speso nel mese", euro(t.monthSpend))}
      ${metric("Budget mese prossimo", euro(t.nextMonthBudget), t.nextMonthBudget >= 0 ? "good" : "bad")}
      ${metric("Spesa variabile consentita", euro(t.variableAllowed), t.variableAllowed >= 0 ? "good" : "bad")}
    </div>
    <div class="cols">
      <div class="panel">
        <h3>Forecast automatico</h3>
        <div class="row"><span>Obiettivi risparmio</span><strong>${euro(t.goalsCost)}</strong></div>
        <div class="row"><span>Accantonamento investimenti</span><strong>${euro(t.investCost)}</strong></div>
        <div class="row"><span>Margine sicurezza</span><strong>${euro(state.settings.safetyBuffer)}</strong></div>
        <hr style="border-color: var(--line); border-style: solid; border-width: 1px 0 0; margin: 10px 0;">
        <div class="row"><span>Spesa variabile max consigliata</span><strong class="${t.variableAllowed >= 0 ? "good" : "bad"}">${euro(t.variableAllowed)}</strong></div>
      </div>
      <div class="panel">
        <h3>Impostazioni mese</h3>
        <form id="settings-form">
          <input type="month" name="month" required value="${state.settings.month}" />
          <input type="number" step="0.01" name="safety" required value="${state.settings.safetyBuffer}" placeholder="Margine sicurezza" />
          <button type="submit">Salva impostazioni</button>
        </form>
      </div>
    </div>
  `;
}

function movimenti() {
  const rows = state.transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(t => `<tr><td>${t.date}</td><td>${t.category}</td><td>${t.note || "-"}</td><td>${euro(t.amount)}</td></tr>`)
    .join("");
  return `
    <div class="panel">
      <h3>Aggiungi spesa giornaliera</h3>
      <form id="tx-form">
        <input type="date" name="date" required />
        <input type="text" name="category" placeholder="Categoria (es. Fuel, Spesa, Hobbies)" required />
        <input type="text" name="note" placeholder="Descrizione" />
        <input type="number" step="0.01" name="amount" placeholder="Importo" required />
        <button type="submit">Aggiungi movimento</button>
      </form>
      <table>
        <thead><tr><th>Data</th><th>Categoria</th><th>Descrizione</th><th class="right">Importo</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">Nessuna spesa inserita</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function conti() {
  const rows = state.accounts.map(a => `<tr><td>${a.name}</td><td>${a.type}</td><td class="right">${euro(a.balance)}</td></tr>`).join("");
  return `
    <div class="panel">
      <h3>Saldo conti correnti e carte</h3>
      <form id="account-form">
        <input type="text" name="name" required placeholder="Nome (es. BNP, SAFRA, AMEX)" />
        <select name="type">
          <option value="conto">Conto corrente</option>
          <option value="carta">Carta di credito</option>
        </select>
        <input type="number" step="0.01" name="balance" required placeholder="Saldo (carta: negativo se debito)" />
        <button type="submit">Aggiungi conto/carta</button>
      </form>
      <table>
        <thead><tr><th>Nome</th><th>Tipo</th><th class="right">Saldo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function entrate() {
  const rows = state.incomes.map(i => `<tr><td>${i.name}</td><td>${i.type}</td><td class="right">${euro(i.amount)}</td></tr>`).join("");
  return `
    <div class="panel">
      <h3>Entrate fisse e variabili</h3>
      <form id="income-form">
        <input type="text" name="name" required placeholder="Voce entrata" />
        <select name="type">
          <option value="fissa">Fissa</option>
          <option value="variabile">Variabile</option>
        </select>
        <input type="number" step="0.01" name="amount" required placeholder="Importo mese" />
        <button type="submit">Aggiungi entrata</button>
      </form>
      <table>
        <thead><tr><th>Voce</th><th>Tipo</th><th class="right">Importo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function fisse() {
  const rows = state.fixedExpenses.map(e => `<tr><td>${e.name}</td><td class="right">${euro(e.amount)}</td></tr>`).join("");
  return `
    <div class="panel">
      <h3>Spese fisse mensili</h3>
      <form id="fixed-form">
        <input type="text" name="name" required placeholder="Voce spesa fissa" />
        <input type="number" step="0.01" name="amount" required placeholder="Importo mese" />
        <button type="submit">Aggiungi spesa fissa</button>
      </form>
      <table>
        <thead><tr><th>Voce</th><th class="right">Importo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function obiettivi() {
  const rows = state.goals.map(g => `<tr><td>${g.name}</td><td class="right">${euro(g.amount)}</td></tr>`).join("");
  return `
    <div class="panel">
      <h3>Obiettivi mensili</h3>
      <form id="goal-form">
        <input type="text" name="name" required placeholder="Nome obiettivo (es. risparmio, vacanza)" />
        <input type="number" step="0.01" name="amount" required placeholder="Importo mensile" />
        <button type="submit">Aggiungi obiettivo</button>
      </form>
      <table>
        <thead><tr><th>Obiettivo</th><th class="right">Importo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function investimenti() {
  const rows = state.investments.map(i => {
    const left = Math.max(0, Number(i.target) - Number(i.saved));
    const months = Number(i.monthly) > 0 ? Math.ceil(left / Number(i.monthly)) : "-";
    return `<tr>
      <td>${i.name}</td>
      <td class="right">${euro(i.saved)}</td>
      <td class="right">${euro(i.target)}</td>
      <td class="right">${euro(i.monthly)}</td>
      <td class="right">${months}</td>
    </tr>`;
  }).join("");

  return `
    <div class="panel">
      <h3>Investimenti e progetti immobiliari</h3>
      <form id="invest-form">
        <input type="text" name="name" required placeholder="Nome investimento/progetto" />
        <input type="number" step="0.01" name="saved" required placeholder="Gia accantonato" />
        <input type="number" step="0.01" name="target" required placeholder="Target totale" />
        <input type="number" step="0.01" name="monthly" required placeholder="Quota mensile" />
        <button type="submit">Aggiungi investimento</button>
      </form>
      <table>
        <thead><tr><th>Nome</th><th class="right">Accantonato</th><th class="right">Target</th><th class="right">Quota/mese</th><th class="right">Mesi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function bindTabEvents() {
  document.querySelectorAll("[data-tab]").forEach(el => {
    el.onclick = () => {
      tab = el.dataset.tab;
      app();
    };
  });
}

function bindFormEvents() {
  onForm("settings-form", (f) => {
    state.settings.month = String(f.get("month"));
    state.settings.safetyBuffer = Number(f.get("safety"));
  });
  onForm("tx-form", (f) => {
    state.transactions.push({
      id: uid(),
      date: String(f.get("date")),
      category: String(f.get("category")),
      note: String(f.get("note") || ""),
      amount: Number(f.get("amount"))
    });
  });
  onForm("account-form", (f) => {
    state.accounts.push({
      id: uid(),
      name: String(f.get("name")),
      type: String(f.get("type")),
      balance: Number(f.get("balance"))
    });
  });
  onForm("income-form", (f) => {
    state.incomes.push({
      id: uid(),
      name: String(f.get("name")),
      type: String(f.get("type")),
      amount: Number(f.get("amount"))
    });
  });
  onForm("fixed-form", (f) => {
    state.fixedExpenses.push({
      id: uid(),
      name: String(f.get("name")),
      amount: Number(f.get("amount"))
    });
  });
  onForm("goal-form", (f) => {
    state.goals.push({
      id: uid(),
      name: String(f.get("name")),
      amount: Number(f.get("amount"))
    });
  });
  onForm("invest-form", (f) => {
    state.investments.push({
      id: uid(),
      name: String(f.get("name")),
      saved: Number(f.get("saved")),
      target: Number(f.get("target")),
      monthly: Number(f.get("monthly"))
    });
  });
}

function onForm(id, callback) {
  const form = document.getElementById(id);
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    callback(f);
    save();
    app();
  };
}

app();

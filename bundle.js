const MONTHS = [
  "GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO",
  "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"
];
const STORAGE_KEY = "pgf_budgeting_daily_expenses_v1";
const SETTINGS_KEY = "pgf_budgeting_accounts_settings_v1";

const monthlyData = [
  { month: "GENNAIO", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 2623.14, fixedExpenses: 4308.04 },
  { month: "FEBBRAIO", fixedIncome: 1938.13, variableIncome: 21937, variableExpenses: 677.44, fixedExpenses: 720.68 },
  { month: "MARZO", fixedIncome: 1938.13, variableIncome: 16352.87, variableExpenses: 4580.88, fixedExpenses: 158 },
  { month: "APRILE", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 4347.18 },
  { month: "MAGGIO", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 725 },
  { month: "GIUGNO", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 158 },
  { month: "LUGLIO", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 4287.56 },
  { month: "AGOSTO", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 158 },
  { month: "SETTEMBRE", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 347.33 },
  { month: "OTTOBRE", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 4102.65 },
  { month: "NOVEMBRE", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 441 },
  { month: "DICEMBRE", fixedIncome: 1938.13, variableIncome: 0, variableExpenses: 0, fixedExpenses: 885 }
];

const currentMonthIdx = Math.max(0, Math.min(11, new Date().getMonth()));
let selectedMonth = MONTHS[currentMonthIdx];
let dailyExpenses = loadDailyExpenses();
let categoryFilter = "tutte";
let settings = loadSettings();

function loadDailyExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveDailyExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyExpenses));
}

function uid() {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultSettings() {
  const conto1 = "conto_1";
  const conto2 = "conto_2";
  const conto3 = "conto_3";
  return {
    accounts: [
      { id: conto1, name: "BNP" },
      { id: conto2, name: "SAFRA" },
      { id: conto3, name: "Contanti" }
    ],
    recurringIncomes: [
      { id: uid(), name: "Stipendio", amount: 1938.13, accountId: conto1, active: true },
      { id: uid(), name: "Commissioni", amount: 0, accountId: conto1, active: true },
      { id: uid(), name: "Affitto", amount: 0, accountId: conto2, active: true }
    ],
    fixedExpenses: [],
    investments: [
      { id: uid(), name: "IBKR", type: "financial", marketValue: 0, annualReturnPct: 0 }
    ],
    properties: []
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    const fallback = defaultSettings();
    return {
      accounts: Array.isArray(parsed.accounts) && parsed.accounts.length ? parsed.accounts : fallback.accounts,
      recurringIncomes: Array.isArray(parsed.recurringIncomes) ? parsed.recurringIncomes : fallback.recurringIncomes,
      fixedExpenses: Array.isArray(parsed.fixedExpenses) ? parsed.fixedExpenses : [],
      investments: Array.isArray(parsed.investments) ? parsed.investments : fallback.investments,
      properties: Array.isArray(parsed.properties) ? parsed.properties : []
    };
  } catch (_) {
    return defaultSettings();
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function euro(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

function monthAt(index) {
  const safeIndex = (index + 12) % 12;
  return monthlyData[safeIndex];
}

function averageVariableIncome() {
  const values = monthlyData.map(m => m.variableIncome).filter(v => v > 0);
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function averageVariableExpenses() {
  const values = monthlyData.map(m => m.variableExpenses).filter(v => v > 0);
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function withForecast(month) {
  const extras = extraVariableExpensesByMonth(month.month);
  const incomeExtras = recurringIncomeTotalForMonth(month.month);
  const fixedExtras = fixedExpensesTotalForMonth(month.month);
  return {
    ...month,
    forecastVariableIncome: (month.variableIncome > 0 ? month.variableIncome : averageVariableIncome()) + incomeExtras.total,
    forecastVariableExpenses: (month.variableExpenses > 0 ? month.variableExpenses : averageVariableExpenses()) + extras.total,
    forecastFixedExpenses: month.fixedExpenses + fixedExtras.total,
    manualCardExpenses: extras.card,
    manualCashExpenses: extras.cash,
    recurringIncomeExtras: incomeExtras.total,
    fixedExpenseExtras: fixedExtras.total
  };
}

function extraVariableExpensesByMonth(monthName) {
  const monthExpenses = dailyExpenses.filter(e => e.month === monthName);
  const card = monthExpenses
    .filter(e => e.method === "carta")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const cash = monthExpenses
    .filter(e => e.method === "contanti")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  return { card, cash, total: card + cash };
}

function totals(month) {
  const totalIncome = month.fixedIncome + month.forecastVariableIncome;
  const totalExpenses = month.forecastFixedExpenses + month.forecastVariableExpenses;
  return {
    totalIncome,
    totalExpenses,
    savings: totalIncome - totalExpenses
  };
}

function recurringIncomeTotalForMonth() {
  const items = settings.recurringIncomes.filter((i) => i.active);
  return {
    total: items.reduce((sum, i) => sum + Number(i.amount || 0), 0),
    items
  };
}

function fixedExpensesTotalForMonth(monthName) {
  const items = settings.fixedExpenses.filter((e) => e.monthScope === "all" || e.monthScope === monthName);
  return {
    total: items.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    items
  };
}

function manualVariableByAccount(monthName) {
  const map = {};
  dailyExpenses
    .filter((e) => e.month === monthName)
    .forEach((e) => {
      const key = e.accountId || "unassigned";
      map[key] = (map[key] || 0) + Number(e.amount || 0);
    });
  return map;
}

function recurringIncomeByAccount() {
  const map = {};
  settings.recurringIncomes
    .filter((i) => i.active)
    .forEach((i) => {
      const key = i.accountId || "unassigned";
      map[key] = (map[key] || 0) + Number(i.amount || 0);
    });
  return map;
}

function fixedExpenseByAccount(monthName) {
  const map = {};
  settings.fixedExpenses
    .filter((e) => e.monthScope === "all" || e.monthScope === monthName)
    .forEach((e) => {
      const key = e.accountId || "unassigned";
      map[key] = (map[key] || 0) + Number(e.amount || 0);
    });
  return map;
}

function accountName(accountId) {
  const account = settings.accounts.find((a) => a.id === accountId);
  return account ? account.name : "Non assegnato";
}

function liquidityForMonth(monthName) {
  const byAccIncome = recurringIncomeByAccount(monthName);
  const byAccFixed = fixedExpenseByAccount(monthName);
  const byAccVar = manualVariableByAccount(monthName);
  return settings.accounts.reduce((sum, account) => {
    const inc = Number(byAccIncome[account.id] || 0);
    const fix = Number(byAccFixed[account.id] || 0);
    const vari = Number(byAccVar[account.id] || 0);
    return sum + (inc - fix - vari);
  }, 0);
}

function investmentTotals() {
  const financial = settings.investments.reduce((sum, inv) => sum + Number(inv.marketValue || 0), 0);
  const estimatedAnnualFinancialYield = settings.investments.reduce(
    (sum, inv) => sum + (Number(inv.marketValue || 0) * Number(inv.annualReturnPct || 0) / 100),
    0
  );
  const realEstateValue = settings.properties.reduce(
    (sum, p) => sum + Number(p.purchase || 0) + Number(p.renovation || 0) + Number(p.appreciation || 0),
    0
  );
  const monthlyRentalIncome = settings.properties.reduce(
    (sum, p) => sum + (Number(p.monthlyRent || 0) * Number(p.units || 1)),
    0
  );
  const annualRentalIncome = monthlyRentalIncome * 12;
  return {
    financial,
    estimatedAnnualFinancialYield,
    realEstateValue,
    monthlyRentalIncome,
    annualRentalIncome
  };
}

function yearlyProjection(startIdx) {
  let totalSavings = 0;
  for (let i = startIdx; i < 12; i += 1) {
    const month = withForecast(monthAt(i));
    totalSavings += totals(month).savings;
  }
  return totalSavings;
}

function app() {
  const selectedIdx = MONTHS.indexOf(selectedMonth);
  const thisMonth = withForecast(monthAt(selectedIdx));
  const nextMonth = withForecast(monthAt(selectedIdx + 1));
  const thisTotals = totals(thisMonth);
  const nextTotals = totals(nextMonth);
  const yearEndSavings = yearlyProjection(selectedIdx);
  const deltaIncomeVsNextSavings = nextTotals.totalIncome - nextTotals.savings;
  const selectedMonthExpenses = dailyExpenses
    .filter(e => e.month === selectedMonth)
    .sort((a, b) => b.date.localeCompare(a.date));
  const monthFixedItems = settings.fixedExpenses.filter((e) => e.monthScope === "all" || e.monthScope === selectedMonth);
  const monthIncomeItems = settings.recurringIncomes.filter((e) => e.active);
  const categoryOptions = Array.from(new Set(selectedMonthExpenses.map((e) => e.category))).sort((a, b) => a.localeCompare(b));
  const filteredExpenses = categoryFilter === "tutte"
    ? selectedMonthExpenses
    : selectedMonthExpenses.filter((e) => e.category === categoryFilter);
  const byAccIncome = recurringIncomeByAccount(selectedMonth);
  const byAccFixed = fixedExpenseByAccount(selectedMonth);
  const byAccVar = manualVariableByAccount(selectedMonth);
  const accountsWithUnassigned = [
    ...settings.accounts,
    { id: "unassigned", name: "Non assegnato" }
  ];
  const inv = investmentTotals();
  const monthLiquidity = liquidityForMonth(selectedMonth);
  const netWorth = monthLiquidity + inv.financial + inv.realEstateValue;

  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="app">
      <h1>PGF Budget Forecast</h1>
      <p class="sub">Dashboard costruita da Cartel.xlsx: stima mese prossimo, risparmio e riepilogo costi fissi.</p>

      <div class="panel">
        <h3>Mese di riferimento</h3>
        <form id="month-form">
          <select id="month-select" name="month">
            ${MONTHS.map(m => `<option value="${m}" ${m === selectedMonth ? "selected" : ""}>${m}</option>`).join("")}
          </select>
        </form>
      </div>

      <div class="cards">
        ${metric("Quanto spenderai il mese prossimo", euro(nextTotals.totalExpenses), "warn")}
        ${metric("Quanto guadagnerai il mese prossimo (stimato)", euro(nextTotals.totalIncome), "good")}
        ${metric("Quanto potrai risparmiare il mese prossimo", euro(nextTotals.savings), nextTotals.savings >= 0 ? "good" : "bad")}
        ${metric("Differenza guadagno vs risparmio mese prossimo", euro(deltaIncomeVsNextSavings))}
        ${metric("Risparmio stimato da ora a fine anno", euro(yearEndSavings), yearEndSavings >= 0 ? "good" : "bad")}
        ${metric("Risparmio del mese selezionato", euro(thisTotals.savings), thisTotals.savings >= 0 ? "good" : "bad")}
        ${metric("Liquidita netta mese selezionato", euro(monthLiquidity), monthLiquidity >= 0 ? "good" : "bad")}
        ${metric("Valore investimenti finanziari (es. IBKR)", euro(inv.financial), "good")}
        ${metric("Valore immobiliare stimato", euro(inv.realEstateValue), "good")}
        ${metric("Net worth totale stimato", euro(netWorth), netWorth >= 0 ? "good" : "bad")}
        ${metric("Affitto mensile totale immobili", euro(inv.monthlyRentalIncome))}
      </div>

      <div class="cols">
        <div class="panel">
          <h3>Riepilogo costi fissi</h3>
          <div class="row"><span>Mese selezionato (${thisMonth.month})</span><strong>${euro(thisMonth.forecastFixedExpenses)}</strong></div>
          <div class="row"><span>Mese successivo (${nextMonth.month})</span><strong>${euro(nextMonth.forecastFixedExpenses)}</strong></div>
          <hr style="border-color: var(--line); border-style: solid; border-width: 1px 0 0; margin: 10px 0;">
          <div class="row"><span>Delta costi fissi</span><strong class="${nextMonth.forecastFixedExpenses - thisMonth.forecastFixedExpenses > 0 ? "bad" : "good"}">${euro(nextMonth.forecastFixedExpenses - thisMonth.forecastFixedExpenses)}</strong></div>
          <div class="row"><span>Extra spese fisse inserite manualmente (${thisMonth.month})</span><strong>${euro(thisMonth.fixedExpenseExtras)}</strong></div>
        </div>

        <div class="panel">
          <h3>Dettaglio forecast ${nextMonth.month}</h3>
          <div class="row"><span>Entrate fisse</span><strong>${euro(nextMonth.fixedIncome)}</strong></div>
          <div class="row"><span>Entrate variabili (storico medio + manuali)</span><strong>${euro(nextMonth.forecastVariableIncome)}</strong></div>
          <div class="row"><span>Entrate extra manuali ricorrenti</span><strong>${euro(nextMonth.recurringIncomeExtras)}</strong></div>
          <div class="row"><span>Uscite variabili (storico medio)</span><strong>${euro(nextMonth.forecastVariableExpenses)}</strong></div>
          <div class="row"><span>di cui inserite a mano (carta)</span><strong>${euro(nextMonth.manualCardExpenses)}</strong></div>
          <div class="row"><span>di cui inserite a mano (contanti)</span><strong>${euro(nextMonth.manualCashExpenses)}</strong></div>
          <div class="row"><span>Uscite fisse</span><strong>${euro(nextMonth.fixedExpenses)}</strong></div>
          <hr style="border-color: var(--line); border-style: solid; border-width: 1px 0 0; margin: 10px 0;">
          <div class="row"><span>Risparmio netto previsto</span><strong class="${nextTotals.savings >= 0 ? "good" : "bad"}">${euro(nextTotals.savings)}</strong></div>
        </div>
      </div>

      <div class="cols">
        <div class="panel">
          <h3>Conti correnti / cassa</h3>
          <form id="account-form">
            <input type="text" name="name" required placeholder="Nome conto (es. Revolut, BNP, Contanti)" />
            <button type="submit">Aggiungi conto</button>
          </form>
          <table>
            <thead><tr><th>Conto</th><th>Azioni</th></tr></thead>
            <tbody>
              ${settings.accounts.map((a) => `
                <tr>
                  <td>${a.name}</td>
                  <td><button type="button" data-action="delete-account" data-id="${a.id}">Elimina</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="panel">
          <h3>Entrate ricorrenti per conto</h3>
          <form id="income-form">
            <input type="text" name="name" required placeholder="Voce entrata (stipendio, commissioni, affitto)" />
            <input type="number" step="0.01" min="0" name="amount" required placeholder="Importo mese" />
            <select name="accountId">${settings.accounts.map((a) => `<option value="${a.id}">${a.name}</option>`).join("")}</select>
            <button type="submit">Aggiungi entrata</button>
          </form>
          <table>
            <thead><tr><th>Voce</th><th>Conto</th><th class="right">Importo</th><th>Azioni</th></tr></thead>
            <tbody>
              ${monthIncomeItems.map((i) => `
                <tr>
                  <td>${i.name}</td>
                  <td>${accountName(i.accountId)}</td>
                  <td class="right">${euro(i.amount)}</td>
                  <td><button type="button" data-action="delete-income" data-id="${i.id}">Elimina</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>Spese fisse per conto</h3>
        <form id="fixed-expense-form">
          <input type="text" name="name" required placeholder="Voce spesa fissa (es. affitto, bollette)" />
          <input type="number" step="0.01" min="0" name="amount" required placeholder="Importo" />
          <select name="accountId">${settings.accounts.map((a) => `<option value="${a.id}">${a.name}</option>`).join("")}</select>
          <select name="monthScope">
            <option value="all">Tutti i mesi</option>
            ${MONTHS.map((m) => `<option value="${m}" ${m === selectedMonth ? "selected" : ""}>Solo ${m}</option>`).join("")}
          </select>
          <button type="submit">Aggiungi spesa fissa</button>
        </form>
        <table>
          <thead><tr><th>Voce</th><th>Mese</th><th>Conto</th><th class="right">Importo</th><th>Azioni</th></tr></thead>
          <tbody>
            ${monthFixedItems.length ? monthFixedItems.map((e) => `
              <tr>
                <td>${e.name}</td>
                <td>${e.monthScope === "all" ? "Tutti" : e.monthScope}</td>
                <td>${accountName(e.accountId)}</td>
                <td class="right">${euro(e.amount)}</td>
                <td><button type="button" data-action="delete-fixed-expense" data-id="${e.id}">Elimina</button></td>
              </tr>
            `).join("") : '<tr><td colspan="5">Nessuna spesa fissa manuale per questo mese</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h3>Movimenti per conto (${selectedMonth})</h3>
        <table>
          <thead><tr><th>Conto</th><th class="right">Entrate</th><th class="right">Spese fisse</th><th class="right">Spese variabili</th><th class="right">Saldo netto</th></tr></thead>
          <tbody>
            ${accountsWithUnassigned.map((a) => {
              const inc = Number(byAccIncome[a.id] || 0);
              const fix = Number(byAccFixed[a.id] || 0);
              const vari = Number(byAccVar[a.id] || 0);
              const net = inc - fix - vari;
              return `
                <tr>
                  <td>${a.name}</td>
                  <td class="right">${euro(inc)}</td>
                  <td class="right">${euro(fix)}</td>
                  <td class="right">${euro(vari)}</td>
                  <td class="right ${net >= 0 ? "good" : "bad"}">${euro(net)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h3>Investimenti finanziari (borsa / IBKR)</h3>
        <form id="investment-form">
          <input type="text" name="name" required placeholder="Nome (es. IBKR, ETF World, Azioni USA)" />
          <input type="number" step="0.01" min="0" name="marketValue" required placeholder="Valore mercato attuale" />
          <input type="number" step="0.01" min="0" name="annualReturnPct" required placeholder="Rendimento annuo % stimato" />
          <button type="submit">Aggiungi investimento</button>
        </form>
        <table>
          <thead><tr><th>Nome</th><th class="right">Valore</th><th class="right">Rendimento annuo %</th><th>Azioni</th></tr></thead>
          <tbody>
            ${settings.investments.length ? settings.investments.map((i) => `
              <tr>
                <td>${i.name}</td>
                <td class="right">${euro(i.marketValue)}</td>
                <td class="right">${Number(i.annualReturnPct || 0).toFixed(2)}%</td>
                <td><button type="button" data-action="delete-investment" data-id="${i.id}">Elimina</button></td>
              </tr>
            `).join("") : '<tr><td colspan="4">Nessun investimento finanziario inserito</td></tr>'}
          </tbody>
        </table>
        <div class="row"><span>Yield annuo stimato investimenti finanziari</span><strong>${euro(inv.estimatedAnnualFinancialYield)}</strong></div>
      </div>

      <div class="panel">
        <h3>Investimenti immobiliari</h3>
        <form id="property-form">
          <input type="text" name="name" required placeholder="Nome immobile/progetto" />
          <input type="number" step="0.01" min="0" name="purchase" required placeholder="Acquisto (x)" />
          <input type="number" step="0.01" min="0" name="renovation" required placeholder="Rinnovazione (y)" />
          <input type="number" step="0.01" name="appreciation" required placeholder="Appreciation (z)" />
          <input type="number" step="1" min="1" name="units" required placeholder="N. appartamenti (1/2/3...)" />
          <input type="number" step="0.01" min="0" name="monthlyRent" required placeholder="Affitto mensile per unita (k)" />
          <button type="submit">Aggiungi immobile</button>
        </form>
        <table>
          <thead><tr><th>Immobile</th><th class="right">Valore stimato</th><th class="right">Unita</th><th class="right">Affitto mese</th><th>Azioni</th></tr></thead>
          <tbody>
            ${settings.properties.length ? settings.properties.map((p) => `
              <tr>
                <td>${p.name}</td>
                <td class="right">${euro(Number(p.purchase || 0) + Number(p.renovation || 0) + Number(p.appreciation || 0))}</td>
                <td class="right">${p.units}</td>
                <td class="right">${euro(Number(p.monthlyRent || 0) * Number(p.units || 1))}</td>
                <td><button type="button" data-action="delete-property" data-id="${p.id}">Elimina</button></td>
              </tr>
            `).join("") : '<tr><td colspan="5">Nessun investimento immobiliare inserito</td></tr>'}
          </tbody>
        </table>
        <div class="row"><span>Affitto annuo totale immobili</span><strong>${euro(inv.annualRentalIncome)}</strong></div>
      </div>

      <div class="panel">
        <h3>Spese giornaliere manuali (${selectedMonth})</h3>
        <form id="daily-expense-form">
          <input type="date" name="date" required />
          <select name="method">
            <option value="carta">Carta di credito</option>
            <option value="contanti">Contanti</option>
          </select>
          <select name="accountId">${settings.accounts.map((a) => `<option value="${a.id}">${a.name}</option>`).join("")}</select>
          <input type="text" name="category" placeholder="Categoria (es. carburante, spesa, svago)" required />
          <input type="number" step="0.01" min="0" name="amount" placeholder="Importo" required />
          <button type="submit">Aggiungi spesa</button>
        </form>
        <div class="row">
          <span>Filtro categoria</span>
          <select id="category-filter">
            <option value="tutte" ${categoryFilter === "tutte" ? "selected" : ""}>Tutte</option>
            ${categoryOptions.map((cat) => `<option value="${cat}" ${categoryFilter === cat ? "selected" : ""}>${cat}</option>`).join("")}
          </select>
        </div>
        <div class="row"><span>Totale manuale carta (${selectedMonth})</span><strong>${euro(thisMonth.manualCardExpenses)}</strong></div>
        <div class="row"><span>Totale manuale contanti (${selectedMonth})</span><strong>${euro(thisMonth.manualCashExpenses)}</strong></div>
        <div class="row">
          <button type="button" id="export-csv-btn">Export CSV mese selezionato</button>
          <button type="button" id="export-pdf-btn">Export PDF mese selezionato</button>
        </div>
        <table>
          <thead><tr><th>Data</th><th>Metodo</th><th>Conto</th><th>Categoria</th><th class="right">Importo</th><th>Azioni</th></tr></thead>
          <tbody>
            ${filteredExpenses.length ? filteredExpenses.map((e) => `
              <tr>
                <td>${e.date}</td>
                <td>${e.method}</td>
                <td>${accountName(e.accountId)}</td>
                <td>${e.category}</td>
                <td class="right">${euro(e.amount)}</td>
                <td>
                  <button type="button" data-action="edit-expense" data-id="${e.id}">Modifica</button>
                  <button type="button" data-action="delete-expense" data-id="${e.id}">Elimina</button>
                </td>
              </tr>
            `).join("") : '<tr><td colspan="6">Nessuna spesa manuale nel filtro selezionato</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  bindEvents();
}

function metric(label, value, tone = "") {
  return `<div class="card"><div class="label">${label}</div><div class="value ${tone}">${value}</div></div>`;
}

function bindEvents() {
  const monthSelect = document.getElementById("month-select");
  if (monthSelect) {
    monthSelect.onchange = () => {
      selectedMonth = monthSelect.value;
      app();
    };
  }

  const categoryFilterSelect = document.getElementById("category-filter");
  if (categoryFilterSelect) {
    categoryFilterSelect.onchange = () => {
      categoryFilter = categoryFilterSelect.value;
      app();
    };
  }

  const dailyExpenseForm = document.getElementById("daily-expense-form");
  if (dailyExpenseForm) {
    dailyExpenseForm.onsubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(dailyExpenseForm);
      const date = String(formData.get("date") || "");
      const dateObj = date ? new Date(date) : null;
      if (!dateObj || Number.isNaN(dateObj.getTime())) return;
      const month = MONTHS[dateObj.getMonth()];
      dailyExpenses.push({
        id: uid(),
        date,
        month,
        method: String(formData.get("method") || "carta"),
        accountId: String(formData.get("accountId") || ""),
        category: String(formData.get("category") || "Spesa"),
        amount: Number(formData.get("amount") || 0)
      });
      saveDailyExpenses();
      app();
    };
  }

  document.querySelectorAll('[data-action="delete-expense"]').forEach((button) => {
    button.onclick = () => {
      const { id } = button.dataset;
      dailyExpenses = dailyExpenses.filter((e) => e.id !== id);
      saveDailyExpenses();
      app();
    };
  });

  const accountForm = document.getElementById("account-form");
  if (accountForm) {
    accountForm.onsubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(accountForm);
      const name = String(formData.get("name") || "").trim();
      if (!name) return;
      settings.accounts.push({ id: uid(), name });
      saveSettings();
      app();
    };
  }

  const incomeForm = document.getElementById("income-form");
  if (incomeForm) {
    incomeForm.onsubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(incomeForm);
      settings.recurringIncomes.push({
        id: uid(),
        name: String(formData.get("name") || "Entrata"),
        amount: Number(formData.get("amount") || 0),
        accountId: String(formData.get("accountId") || ""),
        active: true
      });
      saveSettings();
      app();
    };
  }

  const fixedExpenseForm = document.getElementById("fixed-expense-form");
  if (fixedExpenseForm) {
    fixedExpenseForm.onsubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(fixedExpenseForm);
      settings.fixedExpenses.push({
        id: uid(),
        name: String(formData.get("name") || "Spesa fissa"),
        amount: Number(formData.get("amount") || 0),
        accountId: String(formData.get("accountId") || ""),
        monthScope: String(formData.get("monthScope") || "all")
      });
      saveSettings();
      app();
    };
  }

  const investmentForm = document.getElementById("investment-form");
  if (investmentForm) {
    investmentForm.onsubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(investmentForm);
      settings.investments.push({
        id: uid(),
        name: String(formData.get("name") || "Investimento"),
        type: "financial",
        marketValue: Number(formData.get("marketValue") || 0),
        annualReturnPct: Number(formData.get("annualReturnPct") || 0)
      });
      saveSettings();
      app();
    };
  }

  const propertyForm = document.getElementById("property-form");
  if (propertyForm) {
    propertyForm.onsubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(propertyForm);
      settings.properties.push({
        id: uid(),
        name: String(formData.get("name") || "Immobile"),
        purchase: Number(formData.get("purchase") || 0),
        renovation: Number(formData.get("renovation") || 0),
        appreciation: Number(formData.get("appreciation") || 0),
        units: Number(formData.get("units") || 1),
        monthlyRent: Number(formData.get("monthlyRent") || 0)
      });
      saveSettings();
      app();
    };
  }

  document.querySelectorAll('[data-action="edit-expense"]').forEach((button) => {
    button.onclick = () => {
      const { id } = button.dataset;
      const expense = dailyExpenses.find((e) => e.id === id);
      if (!expense) return;
      const nextAmountRaw = window.prompt("Nuovo importo:", String(expense.amount));
      if (nextAmountRaw === null) return;
      const nextAmount = Number(nextAmountRaw);
      if (Number.isNaN(nextAmount) || nextAmount < 0) return;
      const nextCategory = window.prompt("Nuova categoria:", expense.category);
      if (nextCategory === null) return;
      expense.amount = nextAmount;
      expense.category = nextCategory || expense.category;
      saveDailyExpenses();
      app();
    };
  });

  document.querySelectorAll('[data-action="delete-account"]').forEach((button) => {
    button.onclick = () => {
      const { id } = button.dataset;
      settings.accounts = settings.accounts.filter((a) => a.id !== id);
      settings.recurringIncomes = settings.recurringIncomes.map((i) => (i.accountId === id ? { ...i, accountId: "unassigned" } : i));
      settings.fixedExpenses = settings.fixedExpenses.map((e) => (e.accountId === id ? { ...e, accountId: "unassigned" } : e));
      dailyExpenses = dailyExpenses.map((e) => (e.accountId === id ? { ...e, accountId: "unassigned" } : e));
      saveSettings();
      saveDailyExpenses();
      app();
    };
  });

  document.querySelectorAll('[data-action="delete-income"]').forEach((button) => {
    button.onclick = () => {
      const { id } = button.dataset;
      settings.recurringIncomes = settings.recurringIncomes.filter((i) => i.id !== id);
      saveSettings();
      app();
    };
  });

  document.querySelectorAll('[data-action="delete-fixed-expense"]').forEach((button) => {
    button.onclick = () => {
      const { id } = button.dataset;
      settings.fixedExpenses = settings.fixedExpenses.filter((e) => e.id !== id);
      saveSettings();
      app();
    };
  });

  document.querySelectorAll('[data-action="delete-investment"]').forEach((button) => {
    button.onclick = () => {
      const { id } = button.dataset;
      settings.investments = settings.investments.filter((i) => i.id !== id);
      saveSettings();
      app();
    };
  });

  document.querySelectorAll('[data-action="delete-property"]').forEach((button) => {
    button.onclick = () => {
      const { id } = button.dataset;
      settings.properties = settings.properties.filter((p) => p.id !== id);
      saveSettings();
      app();
    };
  });

  const exportCsvBtn = document.getElementById("export-csv-btn");
  if (exportCsvBtn) {
    exportCsvBtn.onclick = () => exportMonthlyCsv(selectedMonth);
  }

  const exportPdfBtn = document.getElementById("export-pdf-btn");
  if (exportPdfBtn) {
    exportPdfBtn.onclick = () => exportMonthlyPdf(selectedMonth);
  }
}

function exportMonthlyCsv(monthName) {
  const rows = dailyExpenses
    .filter((e) => e.month === monthName)
    .sort((a, b) => a.date.localeCompare(b.date));
  const lines = [
    ["data", "mese", "metodo", "conto", "categoria", "importo"].join(","),
    ...rows.map((e) => [e.date, e.month, e.method, safeCsv(accountName(e.accountId)), safeCsv(e.category), String(e.amount)].join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spese_${monthName.toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function safeCsv(value) {
  const text = String(value || "");
  const escaped = text.replaceAll('"', '""');
  return `"${escaped}"`;
}

function exportMonthlyPdf(monthName) {
  const rows = dailyExpenses
    .filter((e) => e.month === monthName)
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = rows.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Spese ${monthName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
          table { border-collapse: collapse; width: 100%; margin-top: 14px; }
          th, td { border: 1px solid #bbb; padding: 8px; text-align: left; }
          th { background: #f2f2f2; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Spese giornaliere - ${monthName}</h2>
        <p>Totale mese: <strong>${euro(total)}</strong></p>
        <table>
          <thead><tr><th>Data</th><th>Metodo</th><th>Conto</th><th>Categoria</th><th class="right">Importo</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((e) => `
              <tr>
                <td>${e.date}</td>
                <td>${e.method}</td>
                <td>${accountName(e.accountId)}</td>
                <td>${e.category}</td>
                <td class="right">${euro(e.amount)}</td>
              </tr>
            `).join("") : '<tr><td colspan="5">Nessuna spesa</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

app();

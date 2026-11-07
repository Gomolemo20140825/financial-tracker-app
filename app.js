// ===== Categories =====
const CATEGORIES = {
  income: ["Salary", "Freelance", "Investments", "Gifts", "Other Income"],
  expense: [
    "Food & Groceries",
    "Rent & Housing",
    "Transport",
    "Entertainment",
    "Utilities",
    "Healthcare",
    "Shopping",
    "Education",
    "Subscriptions",
    "Other Expense",
  ],
};

const CATEGORY_COLORS = {
  "Food & Groceries": "#f59e0b",
  "Rent & Housing": "#ef4444",
  Transport: "#3b82f6",
  Entertainment: "#8b5cf6",
  Utilities: "#6366f1",
  Healthcare: "#ec4899",
  Shopping: "#14b8a6",
  Education: "#06b6d4",
  Subscriptions: "#f97316",
  "Other Expense": "#94a3b8",
};

// ===== State =====
let transactions = (() => {
  try { return JSON.parse(localStorage.getItem("ft_transactions")) || []; }
  catch { return []; }
})().map((t) => ({
  ...t,
  type: t.type === "expense" ? "expense" : "income",
}));
let currentType = "income";
let categoryChart = null;
let monthlyBudget = parseFloat(localStorage.getItem("ft_budget") || "0");

// ===== DOM Refs =====
const form = document.getElementById("transaction-form");
const descInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const submitBtn = document.getElementById("submit-btn");
const balanceEl = document.getElementById("balance");
const totalIncomeEl = document.getElementById("total-income");
const totalExpensesEl = document.getElementById("total-expenses");
const historyBody = document.getElementById("history-body");
const historyEmpty = document.getElementById("history-empty");
const chartEmpty = document.getElementById("chart-empty");
const filterType = document.getElementById("filter-type");
const filterCategory = document.getElementById("filter-category");
const toggleBtns = document.querySelectorAll(".toggle-btn");

// ===== Helpers =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatCurrency(amount) {
  return "$" + Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function save() {
  try {
    localStorage.setItem("ft_transactions", JSON.stringify(transactions));
  } catch {
    showToast("Could not save: storage full.", "error");
  }
}

function showToast(message, type = "success") {
  // Remove existing toast
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ===== Populate Category Dropdown =====
function populateCategories(type) {
  categorySelect.innerHTML = "";
  CATEGORIES[type].forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

// ===== Populate Filter Category Dropdown =====
function populateFilterCategories() {
  const allCats = [...CATEGORIES.income, ...CATEGORIES.expense];
  const usedCats = new Set(transactions.map((t) => t.category));
  filterCategory.innerHTML = '<option value="all">All Categories</option>';
  allCats.forEach((cat) => {
    if (usedCats.has(cat)) {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      filterCategory.appendChild(opt);
    }
  });
}

// ===== Toggle Income / Expense =====
toggleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    toggleBtns.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
    currentType = btn.dataset.type;
    populateCategories(currentType);
    submitBtn.textContent = currentType === "income" ? "Add Income" : "Add Expense";
    submitBtn.classList.toggle("btn-submit--expense", currentType === "expense");
  });
});

// ===== Add Transaction =====
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const desc = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;
  const date = dateInput.value;

  if (!desc || isNaN(amount) || amount <= 0 || !category || !date) {
    showToast("Please fill in all fields.", "error");
    return;
  }

  const transaction = {
    id: generateId(),
    type: currentType,
    description: desc,
    amount,
    category,
    date,
  };

  transactions.push(transaction);
  save();
  render();

  // Reset form
  descInput.value = "";
  amountInput.value = "";
  dateInput.value = new Date().toISOString().split("T")[0];

  showToast(
    `${currentType === "income" ? "Income" : "Expense"} added: ${formatCurrency(amount)}`
  );
});

// ===== Delete Transaction =====
function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  save();
  render();
  showToast("Transaction deleted.");
}

// ===== Budget =====
function getCurrentMonthExpenses() {
  const now = new Date();
  return transactions
    .filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return (
        t.type === "expense" &&
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

function renderBudget() {
  const fill = document.getElementById("budget-fill");
  const meta = document.getElementById("budget-meta");
  const card = document.getElementById("budget-card");
  const monthEl = document.getElementById("budget-month");

  const now = new Date();
  monthEl.textContent = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const spent = getCurrentMonthExpenses();

  const budgetTrack = document.querySelector(".budget-track");

  if (monthlyBudget <= 0) {
    fill.style.width = "0%";
    fill.classList.remove("budget-fill--over");
    card.classList.remove("budget-card--over");
    if (budgetTrack) budgetTrack.setAttribute("aria-valuenow", "0");
    meta.innerHTML = `<span class="budget-hint">Enter a budget above to track this month's spending.</span>`;
    return;
  }

  const pct = (spent / monthlyBudget) * 100;
  const isOver = spent > monthlyBudget;

  fill.style.width = Math.min(pct, 100) + "%";
  fill.classList.toggle("budget-fill--over", isOver);
  card.classList.toggle("budget-card--over", isOver);
  if (budgetTrack) budgetTrack.setAttribute("aria-valuenow", Math.min(pct, 100).toFixed(0));

  if (isOver) {
    const over = spent - monthlyBudget;
    meta.innerHTML =
      `<span class="budget-stat--over">⚠ ${formatCurrency(over)} over budget</span>` +
      `<span class="budget-divider">·</span>` +
      `<span>${formatCurrency(spent)} of ${formatCurrency(monthlyBudget)} spent</span>`;
  } else {
    const remaining = monthlyBudget - spent;
    meta.innerHTML =
      `<span>${formatCurrency(spent)} of ${formatCurrency(monthlyBudget)} spent</span>` +
      `<span class="budget-divider">·</span>` +
      `<span class="budget-remaining">${formatCurrency(remaining)} remaining</span>`;
  }
}

// ===== Render Everything =====
function render() {
  renderSummary();
  populateFilterCategories();
  renderHistory();
  renderChart();
  renderBudget();
}

// ===== Summary =====
function renderSummary() {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;

  totalIncomeEl.textContent = formatCurrency(income);
  totalExpensesEl.textContent = formatCurrency(expenses);
  balanceEl.textContent = (balance < 0 ? "-" : "") + formatCurrency(balance);
  balanceEl.classList.toggle("amount--negative", balance < 0);
}

// ===== History Table =====
function renderHistory() {
  const typeFilter = filterType.value;
  const catFilter = filterCategory.value;

  let filtered = [...transactions];
  if (typeFilter !== "all") {
    filtered = filtered.filter((t) => t.type === typeFilter);
  }
  if (catFilter !== "all") {
    filtered = filtered.filter((t) => t.category === catFilter);
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    historyBody.innerHTML = "";
    historyEmpty.style.display = "block";
    return;
  }

  historyEmpty.style.display = "none";
  historyBody.innerHTML = filtered
    .map(
      (t) => `
      <tr>
        <td>${new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
        <td>${escapeHtml(t.description)}</td>
        <td><span class="category-badge">${escapeHtml(t.category)}</span></td>
        <td class="amount--${t.type === "expense" ? "expense" : "income"}">${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}</td>
        <td><button class="btn-delete" data-id="${t.id}" aria-label="Delete transaction" title="Delete">✕</button></td>
      </tr>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===== Chart =====
function renderChart() {
  const expenses = transactions.filter((t) => t.type === "expense");

  if (expenses.length === 0) {
    chartEmpty.style.display = "block";
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }
    return;
  }

  chartEmpty.style.display = "none";

  // Aggregate by category
  const catTotals = {};
  expenses.forEach((t) => {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(catTotals);
  const data = Object.values(catTotals);
  const colors = labels.map(
    (l) => CATEGORY_COLORS[l] || "#94a3b8"
  );

  if (categoryChart) {
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.data.datasets[0].backgroundColor = colors;
    categoryChart.update();
  } else {
    const ctx = document.getElementById("category-chart").getContext("2d");
    categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "#ffffff",
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "55%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                return ` ${ctx.label}: $${ctx.parsed.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
}

// ===== Filters =====
filterType.addEventListener("change", renderHistory);
filterCategory.addEventListener("change", renderHistory);

// ===== Delete via event delegation (replaces inline onclick) =====
historyBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-delete");
  if (btn) deleteTransaction(btn.dataset.id);
});

// ===== Budget Input =====
document.getElementById("budget-input").addEventListener("input", (e) => {
  monthlyBudget = parseFloat(e.target.value) || 0;
  localStorage.setItem("ft_budget", monthlyBudget.toString());
  renderBudget();
});

// ===== Init =====
dateInput.value = new Date().toISOString().split("T")[0];
populateCategories(currentType);
if (monthlyBudget > 0) {
  document.getElementById("budget-input").value = monthlyBudget.toFixed(2);
}
render();

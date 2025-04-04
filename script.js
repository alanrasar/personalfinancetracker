
let transactions = [];
let startingBalance = 0;
let currency = '£';
let editIndex = null;
let budgets = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function setStartingBalance() {
  const start = parseFloat(document.getElementById('starting-balance').value);
  if (!isNaN(start)) {
    startingBalance = start;
    updateSummary();
  }
}

function setCurrency() {
  const newCurrency = document.getElementById('currency').value;
  if (newCurrency) {
    currency = newCurrency;
    updateSummary();
    updateList();
    updateBudgetTable();
  }
}

function toggleSettings() {
  const settings = document.getElementById('settings-page');
  settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
}

document.getElementById('date').value = getTodayDate();

document.getElementById('form').addEventListener('submit', function (e) {
  e.preventDefault();

  const description = document.getElementById('description').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const type = document.getElementById('type').value;

  if (!description || !amount || !category || !date || !type) return;

  const transaction = {
    description,
    amount,
    category,
    date,
    type
  };

  if (editIndex !== null) {
    transactions[editIndex] = transaction;
    editIndex = null;
  } else {
    transactions.push(transaction);
  }

  updateList();
  updateSummary();
  updateBudgetTable();
  updateChart();
  this.reset();
  document.getElementById('date').value = getTodayDate(); // reset date to today
  updateCategories(document.getElementById('type').value);
});

function deleteTransaction(index) {
  transactions.splice(index, 1);
  updateList();
  updateSummary();
  updateBudgetTable();
  updateChart();
}

function editTransaction(index) {
  const t = transactions[index];
  document.getElementById('description').value = t.description;
  document.getElementById('amount').value = t.amount;
  document.getElementById('category').value = t.category;
  document.getElementById('date').value = t.date;
  document.getElementById('type').value = t.type;
  updateCategories(t.type);
  editIndex = index;
}

function updateList() {
  const transactionList = document.getElementById('transaction-list');
  transactionList.innerHTML = '';

  const now = new Date();
  currentMonth = now.getMonth();
  currentYear = now.getFullYear();

  const filtered = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  filtered.forEach((t, i) => {
    const item = document.createElement('li');
    const budgetStatus = getBudgetStatus(t);
    item.innerHTML = `${t.date} - ${t.description} (${t.category}): ${currency}${t.amount.toFixed(2)}
      ${budgetStatus}
      <button onclick="editTransaction(${i})">Edit</button>
      <button onclick="deleteTransaction(${i})">Delete</button>`;
    transactionList.appendChild(item);
  });
}

function updateSummary() {
  const now = new Date();
  const filtered = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = startingBalance + income - expenses;

  document.getElementById('total-income').textContent = 'Total Income: ' + currency + income.toFixed(2);
  document.getElementById('total-expenses').textContent = 'Total Expenses: ' + currency + expenses.toFixed(2);
  document.getElementById('balance').textContent = 'Balance: ' + currency + balance.toFixed(2);
}

function getBudgetStatus(transaction) {
  if (transaction.type !== 'expense') return '';
  const date = new Date(transaction.date);
  const now = new Date();

  if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return '';

  const budgetEntry = budgets.find(b => b.category === transaction.category);
  if (!budgetEntry) return '';

  const monthlyTotal = transactions
    .filter(t => t.type === 'expense' &&
                 t.category === transaction.category &&
                 new Date(t.date).getFullYear() === date.getFullYear() &&
                 new Date(t.date).getMonth() === date.getMonth())
    .reduce((sum, t) => sum + t.amount, 0);

  return monthlyTotal > budgetEntry.amount
    ? '<span style="color:red;">(Over Budget)</span>'
    : '<span style="color:green;">(Within Budget)</span>';
}

document.getElementById('budget-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const category = document.getElementById('budget-category').value;
  const amount = parseFloat(document.getElementById('budget-amount').value);
  if (!category || isNaN(amount)) return;

  const existing = budgets.find(b => b.category === category);
  if (existing) {
    existing.amount = amount;
  } else {
    budgets.push({ category, amount });
  }

  updateList();
  updateBudgetTable();
  this.reset();
});

function updateBudgetTable() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const table = document.getElementById('budget-table-body');
  table.innerHTML = '';

  budgets.forEach(b => {
    const spent = transactions
      .filter(t => t.type === 'expense' && t.category === b.category &&
                   new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year)
      .reduce((sum, t) => sum + t.amount, 0);
    const remaining = b.amount - spent;
    const status = remaining < 0 ? '⚠️ Over Budget' : '✅ Under Budget';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${b.category}</td>
      <td>${currency}${b.amount.toFixed(2)}</td>
      <td>${currency}${spent.toFixed(2)}</td>
      <td>${currency}${remaining.toFixed(2)}</td>
      <td>${status}</td>
    `;
    table.appendChild(row);
  });
}

let chart;
function updateChart() {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  const now = new Date();
  const expenses = transactions.filter(t => t.type === 'expense' &&
    new Date(t.date).getMonth() === now.getMonth() &&
    new Date(t.date).getFullYear() === now.getFullYear());
  const categories = [...new Set(expenses.map(t => t.category))];
  const data = categories.map(cat =>
    expenses.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
  );

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        label: 'Expenses by Category',
        data,
        backgroundColor: categories.map(() => '#' + Math.floor(Math.random()*16777215).toString(16))
      }]
    },
    options: {
      responsive: true
    }
  });
}

// Dynamic category update
const typeSelector = document.getElementById('type');
const categorySelector = document.getElementById('category');
const budgetCategorySelector = document.getElementById('budget-category');

const categoryOptions = {
  income: ['Paycheck', 'Gift', 'Interest', 'Bonus', 'Other'],
  expense: ['Food', 'Transport', 'Bills', 'Entertainment', 'Other']
};

function updateCategories(type) {
  categorySelector.innerHTML = '';
  categoryOptions[type].forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelector.appendChild(option);
  });
}

function updateBudgetCategoryOptions() {
  budgetCategorySelector.innerHTML = '';
  categoryOptions.expense.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    budgetCategorySelector.appendChild(option);
  });
}

// Initial setup
updateCategories(typeSelector.value);
updateBudgetCategoryOptions();
typeSelector.addEventListener('change', function () {
  updateCategories(this.value);
});


// Save and load from localStorage
function saveToLocal() {
  const data = {
    transactions,
    budgets,
    startingBalance,
    currency
  };
  localStorage.setItem('financeTrackerData', JSON.stringify(data));
}

function loadFromLocal() {
  const data = JSON.parse(localStorage.getItem('financeTrackerData'));
  if (data) {
    transactions = data.transactions || [];
    budgets = data.budgets || [];
    startingBalance = data.startingBalance || 0;
    currency = data.currency || '£';
  }
}

// Hook into app events
window.onload = () => {
  loadFromLocal();
  updateCategories(document.getElementById('type').value);
  updateBudgetCategoryOptions();
  document.getElementById('date').value = getTodayDate();
  updateList();
  updateSummary();
  updateBudgetTable();
  updateChart();
};

window.addEventListener('beforeunload', saveToLocal);


// Export JSON data
function exportData() {
  const data = {
    transactions,
    budgets,
    startingBalance,
    currency
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "finance_data.json";
  link.click();
  URL.revokeObjectURL(url);
}

// Import JSON data
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      transactions = data.transactions || [];
      budgets = data.budgets || [];
      startingBalance = data.startingBalance || 0;
      currency = data.currency || '£';
      updateList();
      updateSummary();
      updateBudgetTable();
      updateChart();
    } catch (error) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
}


function exportToCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Date,Type,Category,Description,Amount\n";

  transactions.forEach(t => {
    const row = [t.date, t.type, t.category, t.description, t.amount.toFixed(2)];
    csvContent += row.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "transactions.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


function checkBackupReminder() {
  const lastExport = localStorage.getItem('lastExportDate');
  const now = new Date();
  if (lastExport) {
    const then = new Date(lastExport);
    const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
    if (diffDays >= 7) {
      alert("It's been over a week since your last export. Please back up your data.");
    }
  } else {
    alert("You haven't backed up your data yet. Please consider exporting your data.");
  }
}

// Update last export date on export
function exportData() {
  const data = {
    transactions,
    budgets,
    startingBalance,
    currency
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "finance_data.json";
  link.click();
  URL.revokeObjectURL(url);

  localStorage.setItem('lastExportDate', new Date().toISOString());
}

window.onload = () => {
  loadFromLocal();
  updateCategories(document.getElementById('type').value);
  updateBudgetCategoryOptions();
  document.getElementById('date').value = getTodayDate();
  updateList();
  updateSummary();
  updateBudgetTable();
  updateChart();
  checkBackupReminder();
};


function toggleDarkMode() {
  document.body.classList.toggle('dark');
}

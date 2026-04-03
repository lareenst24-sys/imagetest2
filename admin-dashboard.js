const ADMIN_EMAIL = "alieo.8x@gmail.com";
const SUPABASE_URL = window.SUPABASE_URL || "const SUPABASE_URL "https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const logoutBtn = document.getElementById("logoutBtn");
const refreshUsersBtn = document.getElementById("refreshUsersBtn");
const addRuleBtn = document.getElementById("addRuleBtn");
const saveRulesBtn = document.getElementById("saveRulesBtn");
const applyRulesBtn = document.getElementById("applyRulesBtn");

const totalUsers = document.getElementById("totalUsers");
const totalDailyUploads = document.getElementById("totalDailyUploads");
const totalMonthlyUploads = document.getElementById("totalMonthlyUploads");
const projectedPayout = document.getElementById("projectedPayout");

const usersTableBody = document.getElementById("usersTableBody");
const rulesList = document.getElementById("rulesList");
const previewList = document.getElementById("previewList");

const RULES_STORAGE_KEY = "eanova_admin_rules_v2";

let currentUser = null;
let rules = [];

function moneyUsd(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function isAdminUser() {
  if (!currentUser || !ADMIN_EMAIL || !ADMIN_EMAIL.trim()) return false;
  return currentUser.email?.toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();
}

function loadRules() {
  const raw = localStorage.getItem(RULES_STORAGE_KEY);

  if (!raw) {
    rules = [
      { id: "r1", min: 0, max: 99, payment: 0, cut: 0 },
      { id: "r2", min: 100, max: 199, payment: 5, cut: 0 },
      { id: "r3", min: 200, max: 299, payment: 12, cut: 0 },
      { id: "r4", min: 300, max: 999999, payment: 25, cut: 0 }
    ];
    return;
  }

  try {
    rules = JSON.parse(raw);
  } catch {
    rules = [];
  }
}

function saveRules() {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}

function findRule(monthlyUploads) {
  return rules.find((rule) => monthlyUploads >= Number(rule.min) && monthlyUploads <= Number(rule.max)) || null;
}

function renderRules() {
  rulesList.innerHTML = "";

  rules.forEach((rule, index) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    row.innerHTML = `
      <div class="rule-field">
        <label>Min Uploads</label>
        <input type="number" value="${rule.min}" data-index="${index}" data-key="min" />
      </div>
      <div class="rule-field">
        <label>Max Uploads</label>
        <input type="number" value="${rule.max}" data-index="${index}" data-key="max" />
      </div>
      <div class="rule-field">
        <label>Payment (USD)</label>
        <input type="number" step="0.01" value="${rule.payment}" data-index="${index}" data-key="payment" />
      </div>
      <div class="rule-field">
        <label>User Cut %</label>
        <input type="number" step="0.01" value="${rule.cut}" data-index="${index}" data-key="cut" />
      </div>
      <button class="remove-btn" data-remove="${index}" type="button">Remove</button>
    `;
    rulesList.appendChild(row);
  });

  rulesList.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", function () {
      const index = Number(this.dataset.index);
      const key = this.dataset.key;
      rules[index][key] = Number(this.value || 0);
      renderPreview();
    });
  });

  rulesList.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", function () {
      const index = Number(this.dataset.remove);
      rules.splice(index, 1);
      renderRules();
      renderPreview();
    });
  });
}

function renderPreview() {
  previewList.innerHTML = "";

  if (!rules.length) {
    previewList.innerHTML = `<div class="preview-card"><strong>No rules yet</strong><p>Add a rule to preview reward groups.</p></div>`;
    return;
  }

  rules.forEach((rule) => {
    const card = document.createElement("div");
    card.className = "preview-card";
    card.innerHTML = `
      <strong>${rule.min} - ${rule.max} uploads</strong>
      <p>Payment: ${moneyUsd(rule.payment)}<br>User Cut: ${Number(rule.cut).toFixed(2)}%</p>
    `;
    previewList.appendChild(card);
  });
}

function addRule() {
  rules.push({
    id: `r-${Date.now()}`,
    min: 0,
    max: 0,
    payment: 0,
    cut: 0
  });
  renderRules();
  renderPreview();
}

async function loadUsers() {
  const { data, error } = await supabaseClient
    .from("admin_creator_stats")
    .select("user_id,email,name,uploads_today,uploads_this_month")
    .order("uploads_this_month", { ascending: false });

  if (error) {
    console.error(error);
    usersTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">Could not load users.</td></tr>`;
    return;
  }

  const users = data || [];

  if (!users.length) {
    usersTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No users found.</td></tr>`;
    totalUsers.textContent = "0";
    totalDailyUploads.textContent = "0";
    totalMonthlyUploads.textContent = "0";
    projectedPayout.textContent = "$0.00";
    return;
  }

  usersTableBody.innerHTML = "";

  let dailyTotal = 0;
  let monthlyTotal = 0;
  let payoutTotal = 0;

  users.forEach((user) => {
    const daily = Number(user.uploads_today || 0);
    const monthly = Number(user.uploads_this_month || 0);
    const rule = findRule(monthly);
    const payment = Number(rule?.payment || 0);
    const cut = Number(rule?.cut || 0);

    dailyTotal += daily;
    monthlyTotal += monthly;
    payoutTotal += payment;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.name || user.email || "-"}</td>
      <td>${daily}</td>
      <td>${monthly}</td>
      <td>${moneyUsd(payment)}</td>
      <td>${cut.toFixed(2)}%</td>
    `;
    usersTableBody.appendChild(row);
  });

  totalUsers.textContent = String(users.length);
  totalDailyUploads.textContent = String(dailyTotal);
  totalMonthlyUploads.textContent = String(monthlyTotal);
  projectedPayout.textContent = moneyUsd(payoutTotal);
}

async function applyRulesToWallets() {
  const { data, error } = await supabaseClient
    .from("admin_creator_stats")
    .select("user_id,uploads_this_month");

  if (error) {
    alert("Could not load admin stats.");
    return;
  }

  const users = data || [];

  for (const user of users) {
    const monthly = Number(user.uploads_this_month || 0);
    const rule = findRule(monthly);
    const payment = Number(rule?.payment || 0);

    const { error: upsertError } = await supabaseClient
      .from("creator_wallets")
      .upsert({
        user_id: user.user_id,
        balance: payment
      });

    if (upsertError) {
      console.error(upsertError);
      alert("Failed while applying rewards.");
      return;
    }
  }

  alert("Rewards applied successfully.");
}

async function requireAdminLogin() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "/";
    return;
  }

  currentUser = data.user;

  if (!isAdminUser()) {
    alert("Admin access only.");
    window.location.href = "/dashboard/dashboard.html";
    return;
  }

  loadRules();
  renderRules();
  renderPreview();
  await loadUsers();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/";
  });
}

if (refreshUsersBtn) {
  refreshUsersBtn.addEventListener("click", loadUsers);
}

if (addRuleBtn) {
  addRuleBtn.addEventListener("click", addRule);
}

if (saveRulesBtn) {
  saveRulesBtn.addEventListener("click", () => {
    saveRules();
    renderPreview();
    alert("Rules saved.");
  });
}

if (applyRulesBtn) {
  applyRulesBtn.addEventListener("click", applyRulesToWallets);
}

requireAdminLogin();

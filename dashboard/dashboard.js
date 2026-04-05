const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const BUCKET_NAME = "user-images";
const DAILY_LIMIT = 50;
const AD_BONUS_LIMIT = 15;
const MIN_PAYOUT = 100;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* shared dom */
const body = document.body;
const navTabs = document.querySelectorAll(".nav-tab");

/* dashboard dom */
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

const uploadModal = document.getElementById("uploadModal");
const modalUploadBtn = document.getElementById("modalUploadBtn");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCloseBtn = document.getElementById("modalCloseBtn");

const previewBox = document.getElementById("previewBox");
const previewImage = document.getElementById("previewImage");
const previewText = document.getElementById("previewText");

const limitModal = document.getElementById("limitModal");
const closeLimitBtn = document.getElementById("closeLimitBtn");
const watchAdBtn = document.getElementById("watchAdBtn");
const limitStatusText = document.getElementById("limitStatusText");

const todayCountEl = document.getElementById("todayUploadCount");
const monthCountEl = document.getElementById("monthUploadCount");
const progressFillEl = document.getElementById("uploadProgressBar");
const progressTextEl = document.getElementById("uploadProgressText");
const progressNoteEl = document.getElementById("uploadProgressNote");
const uploadStatusBadge = document.getElementById("uploadStatusBadge");
const dailyLimitTextEl = document.getElementById("dailyLimitText");

/* optional shared / premium ui dom */
const creatorNameEls = document.querySelectorAll("[data-creator-name]");
const creatorEmailEls = document.querySelectorAll("[data-creator-email]");
const creatorInitialEls = document.querySelectorAll("[data-creator-initial]");
const pageGreetingEl = document.querySelector("[data-greeting]");
const pageSubGreetingEl = document.querySelector("[data-sub-greeting]");

/* monetisation dom */
const balanceAmountEl = document.getElementById("balanceAmount");
const minPayoutEl = document.getElementById("minPayoutAmount");
const payoutProgressBarEl = document.getElementById("payoutProgressBar");
const payoutProgressTextEl = document.getElementById("payoutProgressText");
const payoutStatusEl = document.getElementById("payoutStatus");
const claimBtn = document.getElementById("claimBtn");
const rewardUnlockTextEl = document.getElementById("rewardUnlockText");
const activityListEl = document.getElementById("activityList");
const milestoneFirstEl = document.getElementById("milestoneFirst");
const milestoneSecondEl = document.getElementById("milestoneSecond");
const milestoneThirdEl = document.getElementById("milestoneThird");

/* profile dom */
const profileNameEl = document.getElementById("profileName");
const profileEmailEl = document.getElementById("profileEmail");
const profileJoinDateEl = document.getElementById("profileJoinDate");
const profileStatusEl = document.getElementById("profileStatus");
const logoutBtn = document.getElementById("logoutBtn");

/* state */
let currentUser = null;
let selectedFile = null;
let previewURL = null;
let todayExtraLimit = 0;

/* ---------------- helpers ---------------- */
function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentPageName() {
  const page = window.location.pathname.split("/").pop();
  return page || "index.html";
}

function formatMoney(value) {
  const safe = Number(value || 0);
  return `$${safe.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDailyBonusStorageKey() {
  if (!currentUser) return "daily_bonus_guest";
  return `daily_bonus_${currentUser.id}`;
}

function getRewardStorageKey() {
  if (!currentUser) return "reward_balance_guest";
  return `reward_balance_${currentUser.id}`;
}

function getClaimHistoryStorageKey() {
  if (!currentUser) return "claim_history_guest";
  return `claim_history_${currentUser.id}`;
}

function loadTodayExtraLimit() {
  const raw = localStorage.getItem(getDailyBonusStorageKey());

  if (!raw) {
    todayExtraLimit = 0;
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    if (parsed.date === getTodayKey()) {
      todayExtraLimit = Number(parsed.extra || 0);
    } else {
      todayExtraLimit = 0;
      localStorage.removeItem(getDailyBonusStorageKey());
    }
  } catch (error) {
    todayExtraLimit = 0;
    localStorage.removeItem(getDailyBonusStorageKey());
  }
}

function saveTodayExtraLimit() {
  localStorage.setItem(
    getDailyBonusStorageKey(),
    JSON.stringify({
      date: getTodayKey(),
      extra: todayExtraLimit
    })
  );
}

function getCurrentDailyLimit() {
  return DAILY_LIMIT + todayExtraLimit;
}

function getStartOfTodayISO() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function getStartOfTomorrowISO() {
  const date = new Date();
  date.setHours(24, 0, 0, 0);
  return date.toISOString();
}

function getStartOfMonthISO() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function getStartOfNextMonthISO() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function getDisplayName(user) {
  if (!user) return "Creator";

  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.username;

  if (metaName && String(metaName).trim()) {
    return String(metaName).trim();
  }

  if (user.email) {
    return user.email.split("@")[0];
  }

  return "Creator";
}

function getInitial(name) {
  if (!name) return "C";
  return String(name).trim().charAt(0).toUpperCase();
}

/* ---------------- premium ui ---------------- */
function injectGlobalUX() {
  if (!document.getElementById("eanova-js-ux-style")) {
    const style = document.createElement("style");
    style.id = "eanova-js-ux-style";
    style.textContent = `
      .toast-stack{
        position:fixed;
        top:18px;
        right:18px;
        z-index:10000;
        display:flex;
        flex-direction:column;
        gap:12px;
        pointer-events:none;
      }
      .eanova-toast{
        min-width:240px;
        max-width:320px;
        padding:14px 16px;
        border-radius:18px;
        color:#fff;
        background:linear-gradient(180deg, rgba(26,26,42,0.96), rgba(16,16,28,0.96));
        border:1px solid rgba(255,255,255,0.08);
        box-shadow:0 18px 45px rgba(0,0,0,0.45), 0 0 30px rgba(139,61,255,0.16);
        backdrop-filter:blur(12px);
        transform:translateY(-10px) scale(0.98);
        opacity:0;
        transition:all .28s ease;
      }
      .eanova-toast.show{
        opacity:1;
        transform:translateY(0) scale(1);
      }
      .eanova-toast-title{
        font-size:0.96rem;
        font-weight:800;
        margin-bottom:4px;
      }
      .eanova-toast-text{
        font-size:0.88rem;
        color:#bfc2da;
        line-height:1.45;
      }
      .dopamine-pop{
        animation:dopaminePop .45s ease;
      }
      @keyframes dopaminePop{
        0%{transform:scale(.96)}
        45%{transform:scale(1.04)}
        100%{transform:scale(1)}
      }
      .soft-pulse{
        animation:softPulse 1.8s infinite;
      }
      @keyframes softPulse{
        0%{box-shadow:0 0 0 rgba(139,61,255,0)}
        50%{box-shadow:0 0 28px rgba(139,61,255,.28)}
        100%{box-shadow:0 0 0 rgba(139,61,255,0)}
      }
    `;
    document.head.appendChild(style);
  }

  if (!document.querySelector(".toast-stack")) {
    const toastStack = document.createElement("div");
    toastStack.className = "toast-stack";
    document.body.appendChild(toastStack);
  }
}

function showToast(title, text = "") {
  injectGlobalUX();

  const stack = document.querySelector(".toast-stack");
  if (!stack) return;

  const toast = document.createElement("div");
  toast.className = "eanova-toast";
  toast.innerHTML = `
    <div class="eanova-toast-title">${title}</div>
    <div class="eanova-toast-text">${text}</div>
  `;

  stack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 280);
  }, 2800);
}

function animateCount(el, endValue, formatter = (v) => String(v), duration = 700) {
  if (!el) return;

  const finalValue = Number(endValue || 0);
  const startValue = Number(el.dataset.value || 0);
  const startTime = performance.now();

  function frame(now) {
    const progress = clamp((now - startTime) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startValue + (finalValue - startValue) * eased;

    el.textContent = formatter(current);
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      el.dataset.value = String(finalValue);
      el.textContent = formatter(finalValue);
    }
  }

  requestAnimationFrame(frame);
}

function addPop(el) {
  if (!el) return;
  el.classList.remove("dopamine-pop");
  void el.offsetWidth;
  el.classList.add("dopamine-pop");
}

function setProgressWidth(el, percent) {
  if (!el) return;
  el.style.width = `${clamp(percent, 0, 100)}%`;
  addPop(el);
}

/* ---------------- auth ---------------- */
async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Error getting user:", error.message);
    return null;
  }

  return data.user;
}

async function requireLogin() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "/";
    return false;
  }

  currentUser = user;
  loadTodayExtraLimit();
  hydrateUserUI();
  return true;
}

async function logoutUser() {
  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error("Logout failed:", error);
  }

  window.location.href = "/";
}

/* ---------------- user ui ---------------- */
function hydrateUserUI() {
  if (!currentUser) return;

  const displayName = getDisplayName(currentUser);
  const email = currentUser.email || "—";
  const initial = getInitial(displayName);

  creatorNameEls.forEach((el) => {
    el.textContent = displayName;
  });

  creatorEmailEls.forEach((el) => {
    el.textContent = email;
  });

  creatorInitialEls.forEach((el) => {
    el.textContent = initial;
  });

  if (profileNameEl) profileNameEl.textContent = displayName;
  if (profileEmailEl) profileEmailEl.textContent = email;
  if (profileJoinDateEl) profileJoinDateEl.textContent = formatDate(currentUser.created_at);
  if (profileStatusEl) profileStatusEl.textContent = "Active";

  if (pageGreetingEl) {
    const first = displayName.split(" ")[0];
    pageGreetingEl.textContent = `Welcome back, ${first}`;
  }

  if (pageSubGreetingEl) {
    pageSubGreetingEl.textContent = "Keep your streak alive and build your rewards.";
  }
}

/* ---------------- navigation ---------------- */
function setActiveNav() {
  if (!navTabs.length) return;

  const currentPage = getCurrentPageName();

  navTabs.forEach((tab) => {
    tab.classList.remove("active");
  });

  if (currentPage === "index.html" || currentPage === "dashboard.html") {
    if (navTabs[0]) navTabs[0].classList.add("active");
  } else if (currentPage === "monetisation.html") {
    if (navTabs[1]) navTabs[1].classList.add("active");
  } else if (currentPage === "profile.html") {
    if (navTabs[2]) navTabs[2].classList.add("active");
  }
}

function setupNavigation() {
  if (!navTabs.length) return;

  navTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      if (index === 0) {
        window.location.href = "index.html";
      } else if (index === 1) {
        window.location.href = "monetisation.html";
      } else if (index === 2) {
        window.location.href = "profile.html";
      }
    });
  });

  setActiveNav();
}

/* ---------------- counts ---------------- */
async function getTodayUploadCount() {
  if (!currentUser) return 0;

  const { count, error } = await supabaseClient
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id)
    .gte("created_at", getStartOfTodayISO())
    .lt("created_at", getStartOfTomorrowISO());

  if (error) {
    console.error("Today count error:", error);
    return 0;
  }

  return count || 0;
}

async function getMonthUploadCount() {
  if (!currentUser) return 0;

  const { count, error } = await supabaseClient
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id)
    .gte("created_at", getStartOfMonthISO())
    .lt("created_at", getStartOfNextMonthISO());

  if (error) {
    console.error("Month count error:", error);
    return 0;
  }

  return count || 0;
}

function calculateEstimatedRewards(monthCount) {
  return Number((monthCount * 0.2).toFixed(2));
}

function getStoredClaimedAmount() {
  const raw = localStorage.getItem(getClaimHistoryStorageKey());
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw);
    return Number(parsed.totalClaimed || 0);
  } catch (error) {
    return 0;
  }
}

function saveClaimedAmount(amount) {
  localStorage.setItem(
    getClaimHistoryStorageKey(),
    JSON.stringify({
      totalClaimed: Number(amount || 0),
      updatedAt: new Date().toISOString()
    })
  );
}

function getStoredRewardBalance() {
  const raw = localStorage.getItem(getRewardStorageKey());
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw);
    return Number(parsed.balance || 0);
  } catch (error) {
    return 0;
  }
}

function saveRewardBalance(amount) {
  localStorage.setItem(
    getRewardStorageKey(),
    JSON.stringify({
      balance: Number(amount || 0),
      updatedAt: new Date().toISOString()
    })
  );
}

function syncRewardBalanceFromUploads(monthCount) {
  const estimated = calculateEstimatedRewards(monthCount);
  const claimed = getStoredClaimedAmount();
  const available = Math.max(estimated - claimed, 0);
  saveRewardBalance(available);
  return available;
}

/* ---------------- dashboard ui ---------------- */
function updateProgressUI(todayCount, monthCount) {
  const currentLimit = getCurrentDailyLimit();
  const percent = Math.min((todayCount / currentLimit) * 100, 100);

  if (todayCountEl) animateCount(todayCountEl, todayCount, (v) => `${Math.round(v)}`);
  if (monthCountEl) animateCount(monthCountEl, monthCount, (v) => `${Math.round(v)}`);
  if (progressTextEl) progressTextEl.textContent = `${todayCount} / ${currentLimit}`;
  if (progressFillEl) setProgressWidth(progressFillEl, percent);

  let badgeText = "New Day";
  let noteText = "Start your first upload and begin building today’s progress.";

  if (todayCount > 0 && percent < 30) {
    badgeText = "Starting";
    noteText = "You’re building momentum. Keep going.";
  } else if (percent >= 30 && percent < 70) {
    badgeText = "Active";
    noteText = "Nice progress today. You’re in the zone.";
  } else if (percent >= 70 && percent < 100) {
    badgeText = "Hot";
    noteText = "You’re getting close to today’s limit.";
  } else if (todayCount >= currentLimit) {
    badgeText = "Limit Reached";
    noteText = "You hit today’s limit. Watch an ad to unlock 15 more uploads for today.";
  }

  if (uploadStatusBadge) {
    uploadStatusBadge.textContent = badgeText;
    addPop(uploadStatusBadge);
  }

  if (progressNoteEl) progressNoteEl.textContent = noteText;

  if (dailyLimitTextEl) {
    dailyLimitTextEl.textContent =
      todayExtraLimit > 0
        ? `Daily uploads reset every day. Bonus unlocked today: +${todayExtraLimit}.`
        : "Daily uploads reset every day.";
  }

  if (uploadBtn) {
    uploadBtn.classList.toggle("soft-pulse", todayCount < currentLimit);
  }
}

async function updateUploadStatsUI() {
  const todayCount = await getTodayUploadCount();
  const monthCount = await getMonthUploadCount();

  updateProgressUI(todayCount, monthCount);

  const availableBalance = syncRewardBalanceFromUploads(monthCount);
  updateMonetisationUI(availableBalance, monthCount);
}

/* ---------------- upload preview ---------------- */
function resetPreview() {
  selectedFile = null;

  if (previewURL) {
    URL.revokeObjectURL(previewURL);
    previewURL = null;
  }

  if (previewImage) previewImage.src = "";
  if (previewBox) previewBox.classList.remove("active");
  if (previewText) previewText.textContent = "No image selected";

  if (modalConfirmBtn) {
    modalConfirmBtn.disabled = true;
    modalConfirmBtn.textContent = "Confirm Upload";
  }

  if (fileInput) {
    fileInput.value = "";
  }
}

function openUploadModal() {
  resetPreview();
  if (uploadModal) uploadModal.classList.remove("hidden");
}

function closeUploadModal() {
  if (uploadModal) uploadModal.classList.add("hidden");
  resetPreview();
}

function openLimitModal() {
  if (!limitModal) return;
  if (limitStatusText) limitStatusText.textContent = "";
  limitModal.classList.remove("hidden");
}

function closeLimitModal() {
  if (!limitModal) return;
  limitModal.classList.add("hidden");
}

/* ---------------- upload logic ---------------- */
async function handleUpload(file) {
  if (!currentUser) {
    showToast("Session expired", "Please log in again.");
    window.location.href = "/";
    return false;
  }

  const todayCount = await getTodayUploadCount();
  const currentLimit = getCurrentDailyLimit();

  if (todayCount >= currentLimit) {
    openLimitModal();
    return false;
  }

  const fileExt = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const filePath = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  try {
    if (modalConfirmBtn) {
      modalConfirmBtn.disabled = true;
      modalConfirmBtn.textContent = "Uploading...";
    }

    const { error: uploadError } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      showToast("Upload failed", "Please try again.");
      return false;
    }

    const { error: insertError } = await supabaseClient
      .from("uploads")
      .insert({
        user_id: currentUser.id,
        file_name: filePath,
        storage_deleted: false
      });

    if (insertError) {
      console.error("Database insert failed:", insertError);
      showToast("Upload saved, record failed", "Check your database rules.");
      return false;
    }

    const { error: deleteStorageError } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (deleteStorageError) {
      console.error("Auto delete storage error:", deleteStorageError);
    } else {
      await supabaseClient
        .from("uploads")
        .update({ storage_deleted: true })
        .eq("user_id", currentUser.id)
        .eq("file_name", filePath);
    }

    await updateUploadStatsUI();
    closeUploadModal();
    showToast("Upload complete", "Nice. Your progress just increased.");
    return true;
  } catch (error) {
    console.error("Upload error:", error);
    showToast("Something went wrong", "Please try again.");
    return false;
  } finally {
    if (modalConfirmBtn) {
      modalConfirmBtn.textContent = "Confirm Upload";
      modalConfirmBtn.disabled = false;
    }
  }
}

/* ---------------- ad bonus ---------------- */
async function simulateWatchAdAndIncreaseLimit() {
  if (!watchAdBtn) return;

  watchAdBtn.disabled = true;
  watchAdBtn.textContent = "Processing...";

  if (limitStatusText) {
    limitStatusText.textContent = "Boosting your daily limit...";
  }

  await delay(900);

  todayExtraLimit += AD_BONUS_LIMIT;
  saveTodayExtraLimit();
  await updateUploadStatsUI();

  if (limitStatusText) {
    limitStatusText.textContent = "Ad completed. Daily limit increased by 15 for today.";
  }

  showToast("Boost unlocked", `+${AD_BONUS_LIMIT} uploads added for today.`);

  setTimeout(() => {
    watchAdBtn.disabled = false;
    watchAdBtn.textContent = "Watch Ad to Increase Limit";
    closeLimitModal();
  }, 1000);
}

/* ---------------- monetisation ---------------- */
function getPayoutStatus(balance) {
  if (balance >= MIN_PAYOUT) {
    return {
      label: "Ready to Claim",
      note: "Your balance is ready for payout.",
      percent: 100
    };
  }

  const percent = Math.min((balance / MIN_PAYOUT) * 100, 100);

  if (percent === 0) {
    return {
      label: "Just Started",
      note: "Start uploading to unlock rewards.",
      percent
    };
  }

  if (percent < 50) {
    return {
      label: "Building",
      note: "You’re moving toward the first payout.",
      percent
    };
  }

  if (percent < 100) {
    return {
      label: "Almost There",
      note: `Only ${formatMoney(MIN_PAYOUT - balance)} left to unlock payout.`,
      percent
    };
  }

  return {
    label: "Ready to Claim",
    note: "Your balance is ready for payout.",
    percent
  };
}

function renderActivity(monthCount, balance) {
  if (!activityListEl) return;

  const items = [
    `Monthly uploads counted: ${monthCount}`,
    `Estimated available rewards: ${formatMoney(balance)}`,
    balance >= MIN_PAYOUT
      ? "Claim is unlocked for this account."
      : `Need ${formatMoney(Math.max(MIN_PAYOUT - balance, 0))} more to unlock claim.`
  ];

  activityListEl.innerHTML = items
    .map((item) => `<div class="activity-item">${item}</div>`)
    .join("");
}

function updateMilestones(balance) {
  if (milestoneFirstEl) {
    milestoneFirstEl.textContent = balance >= 10 ? "Unlocked" : "In Progress";
  }

  if (milestoneSecondEl) {
    milestoneSecondEl.textContent = balance >= 50 ? "Unlocked" : "Locked";
  }

  if (milestoneThirdEl) {
    milestoneThirdEl.textContent = balance >= MIN_PAYOUT ? "Unlocked" : "Locked";
  }
}

function updateMonetisationUI(balance, monthCount = 0) {
  const safeBalance = Number(balance || 0);
  const status = getPayoutStatus(safeBalance);

  if (balanceAmountEl) {
    animateCount(balanceAmountEl, safeBalance, (v) => formatMoney(v), 800);
  }

  if (minPayoutEl) {
    minPayoutEl.textContent = formatMoney(MIN_PAYOUT);
  }

  if (payoutProgressBarEl) {
    setProgressWidth(payoutProgressBarEl, status.percent);
  }

  if (payoutProgressTextEl) {
    payoutProgressTextEl.textContent = `${Math.round(status.percent)}% to payout`;
  }

  if (payoutStatusEl) {
    payoutStatusEl.textContent = status.label;
    addPop(payoutStatusEl);
  }

  if (rewardUnlockTextEl) {
    rewardUnlockTextEl.textContent = status.note;
  }

  if (claimBtn) {
    const canClaim = safeBalance >= MIN_PAYOUT;
    claimBtn.disabled = !canClaim;
    claimBtn.textContent = canClaim ? "Claim Rewards" : "Claim Locked";
    claimBtn.classList.toggle("soft-pulse", canClaim);
  }

  updateMilestones(safeBalance);
  renderActivity(monthCount, safeBalance);
}

function handleClaim() {
  const currentBalance = getStoredRewardBalance();

  if (currentBalance < MIN_PAYOUT) {
    showToast("Claim locked", `You need ${formatMoney(MIN_PAYOUT - currentBalance)} more.`);
    return;
  }

  const alreadyClaimed = getStoredClaimedAmount();
  saveClaimedAmount(alreadyClaimed + currentBalance);
  saveRewardBalance(0);
  updateMonetisationUI(0, 0);
  showToast("Claim submitted", "Your reward request was recorded.");
}

/* ---------------- profile ---------------- */
function setupProfileUI() {
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }
}

/* ---------------- events ---------------- */
if (uploadBtn) {
  uploadBtn.addEventListener("click", openUploadModal);
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", closeUploadModal);
}

if (uploadModal) {
  uploadModal.addEventListener("click", (event) => {
    if (event.target === uploadModal) {
      closeUploadModal();
    }
  });
}

if (modalUploadBtn && fileInput) {
  modalUploadBtn.addEventListener("click", () => {
    fileInput.click();
  });
}

if (fileInput) {
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    selectedFile = file;

    if (previewURL) {
      URL.revokeObjectURL(previewURL);
    }

    previewURL = URL.createObjectURL(file);

    if (previewImage) previewImage.src = previewURL;
    if (previewBox) previewBox.classList.add("active");
    if (previewText) previewText.textContent = file.name;

    if (modalConfirmBtn) {
      modalConfirmBtn.disabled = false;
    }
  });
}

if (modalConfirmBtn) {
  modalConfirmBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    await handleUpload(selectedFile);
  });
}

if (closeLimitBtn) {
  closeLimitBtn.addEventListener("click", closeLimitModal);
}

if (limitModal) {
  limitModal.addEventListener("click", (event) => {
    if (event.target === limitModal) {
      closeLimitModal();
    }
  });
}

if (watchAdBtn) {
  watchAdBtn.addEventListener("click", simulateWatchAdAndIncreaseLimit);
}

if (claimBtn) {
  claimBtn.addEventListener("click", handleClaim);
}

/* ---------------- init ---------------- */
(async function initApp() {
  injectGlobalUX();
  setupNavigation();
  setupProfileUI();

  const ok = await requireLogin();
  if (!ok) return;

  await updateUploadStatsUI();

  const currentPage = getCurrentPageName();

  if (currentPage === "monetisation.html") {
    const monthCount = await getMonthUploadCount();
    const balance = syncRewardBalanceFromUploads(monthCount);
    updateMonetisationUI(balance, monthCount);
  }

  if (currentPage === "profile.html") {
    showToast("Profile loaded", "Your creator account is ready.");
  }
})();

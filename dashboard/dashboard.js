const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";
const BUCKET_NAME = "user-images";
const DAILY_LIMIT = 50;
const AD_BONUS_LIMIT = 15;
const MIN_PAYOUT = 100;

/* earning system */
const BASE_REWARD_PER_UPLOAD = 0.001;
const AD_WATCH_REWARD_BONUS = 0.01;
const STREAK_BONUS_STEP = 0.002;
const MAX_MONTHLY_STREAK_BONUS = 0.05;

/* ad system - Social Bar only */
const AD_SCRIPT_SRC =
  "https://pl29118316.profitablecpmratenetwork.com/1d/a5/60/1da560e9f3b77f26473bdf134ff1f1c0.js";

let adScriptPromise = null;

function ensureAdScriptLoaded() {
  if (adScriptPromise) return adScriptPromise;

  adScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${AD_SCRIPT_SRC}"]`);

    if (existing) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = AD_SCRIPT_SRC;
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Social Bar script failed to load.");
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return adScriptPromise;
}

async function triggerAd() {
  try {
    await ensureAdScriptLoaded();
  } catch (error) {
    console.warn("Ad trigger error:", error);
  }
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navTabs = document.querySelectorAll(".nav-tab");

/* dashboard */
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

/* profile */
const creatorNameEls = document.querySelectorAll("[data-creator-name]");
const creatorEmailEls = document.querySelectorAll("[data-creator-email]");
const creatorInitialEls = document.querySelectorAll("[data-creator-initial]");
const profileNameEl = document.getElementById("profileName");
const profileEmailEl = document.getElementById("profileEmail");
const profileJoinDateEl = document.getElementById("profileJoinDate");
const profileStatusEl = document.getElementById("profileStatus");

/* profile account popup */
const accountActionBtn = document.getElementById("accountActionBtn");
const accountModal = document.getElementById("accountModal");
const closeAccountModal = document.getElementById("closeAccountModal");
const modalLogout = document.getElementById("modalLogout");
const modalDelete = document.getElementById("modalDelete");

/* monetisation */
const balanceAmountEl = document.getElementById("balanceAmount");
const minPayoutEl = document.getElementById("minPayoutAmount");
const estimatedMonthValueEl = document.getElementById("estimatedMonthValue");
const payoutProgressBarEl = document.getElementById("payoutProgressBar");
const payoutProgressTextEl = document.getElementById("payoutProgressText");
const payoutStatusEl = document.getElementById("payoutStatus");
const rewardUnlockTextEl = document.getElementById("rewardUnlockText");
const claimBtn = document.getElementById("claimBtn");
const activityListEl = document.getElementById("activityList");
const routeChips = document.querySelectorAll(".route-chip");
const monthEarningsStatEl = document.getElementById("monthEarningsStat");
const lifetimeEarningsStatEl = document.getElementById("lifetimeEarningsStat");
const claimSelectedLabelEl = document.querySelector(".claim-selected strong");

let currentUser = null;
let selectedFile = null;
let previewURL = null;
let todayExtraLimit = 0;
let selectedRoute = "Gift Card";

let latestTodayCount = 0;
let latestMonthCount = 0;
let latestLifetimeCount = 0;

function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCleanPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getDisplayName(user) {
  if (!user) return "Creator";

  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
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
  return String(name || "C").trim().charAt(0).toUpperCase();
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

function getRewardBonusStorageKey() {
  if (!currentUser) return "reward_bonus_guest";
  return `reward_bonus_${currentUser.id}`;
}

function getLastAdPromptStorageKey() {
  if (!currentUser) return "last_ad_prompt_guest";
  return `last_ad_prompt_${currentUser.id}`;
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

function getStoredRewardBonus() {
  const raw = localStorage.getItem(getRewardBonusStorageKey());
  if (!raw) return 0;

  try {
    return Number(JSON.parse(raw).bonus || 0);
  } catch (error) {
    return 0;
  }
}

function saveRewardBonus(amount) {
  localStorage.setItem(
    getRewardBonusStorageKey(),
    JSON.stringify({
      bonus: Number(amount || 0),
      updatedAt: new Date().toISOString()
    })
  );
}

function addRewardBonus(amount) {
  const currentBonus = getStoredRewardBonus();
  saveRewardBonus(currentBonus + Number(amount || 0));
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

function animateCount(el, endValue, formatter = (v) => String(v), duration = 700) {
  if (!el) return;

  const finalValue = Number(endValue || 0);
  const startValue = Number(el.dataset.value || 0);
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
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

function setProgressWidth(el, percent) {
  if (!el) return;
  el.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function showToast(title, text = "") {
  let stack = document.querySelector(".toast-stack");

  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.style.position = "fixed";
    stack.style.top = "18px";
    stack.style.right = "18px";
    stack.style.zIndex = "10000";
    stack.style.display = "flex";
    stack.style.flexDirection = "column";
    stack.style.gap = "12px";
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.style.minWidth = "240px";
  toast.style.maxWidth = "320px";
  toast.style.padding = "14px 16px";
  toast.style.borderRadius = "18px";
  toast.style.color = "#fff";
  toast.style.background = "linear-gradient(180deg, rgba(26,26,42,0.96), rgba(16,16,28,0.96))";
  toast.style.border = "1px solid rgba(255,255,255,0.08)";
  toast.style.boxShadow = "0 18px 45px rgba(0,0,0,0.45), 0 0 30px rgba(139,61,255,0.16)";
  toast.innerHTML = `<strong style="display:block;margin-bottom:4px;">${title}</strong><span style="color:#bfc2da;">${text}</span>`;

  stack.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2600);
}

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
}

function setupNavigation() {
  if (!navTabs.length) return;

  const path = getCleanPath();

  navTabs.forEach((tab) => tab.classList.remove("active"));

  if (path === "/dashboard" || path === "/dashboard/index.html") {
    if (navTabs[0]) navTabs[0].classList.add("active");
  } else if (path === "/dashboard/monetisation" || path === "/dashboard/monetisation/index.html") {
    if (navTabs[1]) navTabs[1].classList.add("active");
  } else if (path === "/dashboard/profile" || path === "/dashboard/profile/index.html") {
    if (navTabs[2]) navTabs[2].classList.add("active");
  }

  navTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      if (index === 0) window.location.href = "/dashboard/";
      if (index === 1) window.location.href = "/dashboard/monetisation/";
      if (index === 2) window.location.href = "/dashboard/profile/";
    });
  });
}

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

async function getLifetimeUploadCount() {
  if (!currentUser) return 0;

  const { count, error } = await supabaseClient
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Lifetime count error:", error);
    return 0;
  }

  return count || 0;
}

function calculateStreakBonus(monthCount) {
  const steps = Math.floor(Number(monthCount || 0) / 25);
  return Math.min(steps * STREAK_BONUS_STEP, MAX_MONTHLY_STREAK_BONUS);
}

function calculateMonthEarnings(monthCount) {
  const base = monthCount * BASE_REWARD_PER_UPLOAD;
  const streakBonus = calculateStreakBonus(monthCount);
  return Number((base + streakBonus).toFixed(3));
}

function calculateLifetimeEarnings(lifetimeCount, monthCount = latestMonthCount) {
  const uploadValue = lifetimeCount * BASE_REWARD_PER_UPLOAD;
  const adBonusValue = getStoredRewardBonus();
  const streakBonusValue = calculateStreakBonus(monthCount);
  return Number((uploadValue + adBonusValue + streakBonusValue).toFixed(3));
}

function getStoredClaimedAmount() {
  const raw = localStorage.getItem(getClaimHistoryStorageKey());
  if (!raw) return 0;

  try {
    return Number(JSON.parse(raw).totalClaimed || 0);
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
    return Number(JSON.parse(raw).balance || 0);
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

function syncRewardBalanceFromUploads(monthCount, lifetimeCount) {
  const lifetimeEstimated = calculateLifetimeEarnings(lifetimeCount, monthCount);
  const claimed = getStoredClaimedAmount();
  const available = Math.max(lifetimeEstimated - claimed, 0);
  saveRewardBalance(available);
  return available;
}

function shouldShowAdPrompt(todayCount) {
  if (!todayCount || todayCount <= 0) return false;
  if (todayCount >= getCurrentDailyLimit()) return true;
  if (todayCount % 20 !== 0) return false;

  const lastPrompt = localStorage.getItem(getLastAdPromptStorageKey());
  if (lastPrompt === `${getTodayKey()}_${todayCount}`) return false;

  localStorage.setItem(getLastAdPromptStorageKey(), `${getTodayKey()}_${todayCount}`);
  return true;
}

function updateProgressUI(todayCount, monthCount, lifetimeCount) {
  const currentLimit = getCurrentDailyLimit();
  const percent = Math.min((todayCount / currentLimit) * 100, 100);

  if (todayCountEl) animateCount(todayCountEl, lifetimeCount, (v) => `${Math.round(v)}`);
  if (monthCountEl) animateCount(monthCountEl, monthCount, (v) => `${Math.round(v)}`);
  if (progressTextEl) progressTextEl.textContent = `${todayCount} / ${currentLimit}`;
  if (progressFillEl) setProgressWidth(progressFillEl, percent);

  let badgeText = "New Day";
  let noteText = "Start your first upload and build today’s progress.";

  if (todayCount > 0 && percent < 30) {
    badgeText = "Starting";
    noteText = "You’re building momentum.";
  } else if (percent >= 30 && percent < 70) {
    badgeText = "Active";
    noteText = "Nice progress today.";
  } else if (percent >= 70 && percent < 100) {
    badgeText = "Hot";
    noteText = "You’re getting close to today’s limit.";
  } else if (todayCount >= currentLimit) {
    badgeText = "Limit Reached";
    noteText = "You hit today’s limit. Watch an ad to unlock 15 more uploads for today.";
  }

  if (uploadStatusBadge) uploadStatusBadge.textContent = badgeText;
  if (progressNoteEl) progressNoteEl.textContent = noteText;

  if (dailyLimitTextEl) {
    dailyLimitTextEl.textContent =
      todayExtraLimit > 0
        ? `Daily uploads reset every day. Bonus unlocked today: +${todayExtraLimit}.`
        : "Daily uploads reset every day.";
  }
}

async function updateUploadStatsUI() {
  latestTodayCount = await getTodayUploadCount();
  latestMonthCount = await getMonthUploadCount();
  latestLifetimeCount = await getLifetimeUploadCount();

  updateProgressUI(latestTodayCount, latestMonthCount, latestLifetimeCount);

  const availableBalance = syncRewardBalanceFromUploads(latestMonthCount, latestLifetimeCount);
  updateMonetisationUI(availableBalance, latestMonthCount, latestLifetimeCount);
  updateProfileStats(latestLifetimeCount, latestMonthCount);

  if (shouldShowAdPrompt(latestTodayCount)) {
    openLimitModal();
  }
}

function updateProfileStats(lifetimeCount, monthCount) {
  const lifetimeEls = document.querySelectorAll("[data-lifetime-uploads]");
  const monthEls = document.querySelectorAll("[data-month-uploads]");

  lifetimeEls.forEach((el) => {
    animateCount(el, lifetimeCount, (v) => `${Math.round(v)}`);
  });

  monthEls.forEach((el) => {
    animateCount(el, monthCount, (v) => `${Math.round(v)}`);
  });
}

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

function openAccountModal() {
  if (!accountModal) return;
  accountModal.classList.remove("hidden");
}

function closeProfileAccountModal() {
  if (!accountModal) return;
  accountModal.classList.add("hidden");
}

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
      console.error("Upload record failed:", insertError);
      showToast("Upload record failed", "Check database rules.");
      return false;
    }

    const { error: deleteStorageError } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (!deleteStorageError) {
      await supabaseClient
        .from("uploads")
        .update({ storage_deleted: true })
        .eq("user_id", currentUser.id)
        .eq("file_name", filePath);
    }

    await updateUploadStatsUI();
    closeUploadModal();
    showToast("Upload complete", "Keep going to grow your rewards.");
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

async function simulateWatchAdAndIncreaseLimit() {
  if (!watchAdBtn) return;

  watchAdBtn.disabled = true;
  watchAdBtn.textContent = "Opening Ad...";

  if (limitStatusText) {
    limitStatusText.textContent = "Opening ad and preparing your bonus...";
  }

  await triggerAd();

  setTimeout(async () => {
    todayExtraLimit += AD_BONUS_LIMIT;
    saveTodayExtraLimit();
    addRewardBonus(AD_WATCH_REWARD_BONUS);
    await updateUploadStatsUI();

    if (limitStatusText) {
      limitStatusText.textContent = "Ad completed. Daily limit increased by 15 for today.";
    }

    showToast("Boost unlocked", `+${AD_BONUS_LIMIT} uploads and ${formatMoney(AD_WATCH_REWARD_BONUS)} bonus added.`);

    watchAdBtn.disabled = false;
    watchAdBtn.textContent = "Watch Ad";
    closeLimitModal();
  }, 1200);
}

function getPayoutStatus(balance) {
  const percent = Math.min((balance / MIN_PAYOUT) * 100, 100);

  if (balance >= MIN_PAYOUT) {
    return {
      label: "Ready to Claim",
      note: "Your balance is ready for payout.",
      percent: 100
    };
  }

  if (percent === 0) {
    return {
      label: "Growing",
      note: "Your balance grows through uploads and bonus activity.",
      percent: 1
    };
  }

  return {
    label: "Growing",
    note: "Keep uploading and using bonus activity to move closer to payout.",
    percent
  };
}

function updateMonetisationUI(balance, monthCount = 0, lifetimeCount = 0) {
  const safeBalance = Number(balance || 0);
  const status = getPayoutStatus(safeBalance);
  const monthEarnings = calculateMonthEarnings(monthCount);
  const lifetimeEarnings = calculateLifetimeEarnings(lifetimeCount, monthCount);
  const streakBonus = calculateStreakBonus(monthCount);

  if (balanceAmountEl) animateCount(balanceAmountEl, safeBalance, (v) => formatMoney(v), 800);
  if (minPayoutEl) minPayoutEl.textContent = formatMoney(MIN_PAYOUT);
  if (estimatedMonthValueEl) estimatedMonthValueEl.textContent = formatMoney(monthEarnings);
  if (payoutProgressBarEl) setProgressWidth(payoutProgressBarEl, status.percent);
  if (payoutProgressTextEl) payoutProgressTextEl.textContent = `${Math.round(status.percent)}% to payout`;
  if (payoutStatusEl) payoutStatusEl.textContent = status.label;

  if (rewardUnlockTextEl) {
    rewardUnlockTextEl.textContent =
      streakBonus > 0
        ? `${status.note} Streak bonus active: ${formatMoney(streakBonus)}.`
        : status.note;
  }

  if (monthEarningsStatEl) {
    animateCount(monthEarningsStatEl, monthEarnings, (v) => formatMoney(v), 800);
  }

  if (lifetimeEarningsStatEl) {
    animateCount(lifetimeEarningsStatEl, lifetimeEarnings, (v) => formatMoney(v), 800);
  }

  if (claimSelectedLabelEl) {
    claimSelectedLabelEl.textContent = selectedRoute;
  }

  if (claimBtn) {
    claimBtn.disabled = safeBalance < MIN_PAYOUT;
    claimBtn.textContent = safeBalance >= MIN_PAYOUT ? "Claim Rewards" : "Claim Locked";
  }

  if (activityListEl) {
    activityListEl.innerHTML = `
      <div class="activity-item">Minimum payout: <strong>${formatMoney(MIN_PAYOUT)}</strong></div>
      <div class="activity-item">This month earnings: <strong>${formatMoney(monthEarnings)}</strong></div>
      <div class="activity-item">Selected payout route: <strong>${selectedRoute}</strong></div>
    `;
  }
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
  updateMonetisationUI(0, latestMonthCount, latestLifetimeCount);
  showToast("Claim submitted", "Your reward request was recorded.");
}

function setupRouteChips() {
  if (!routeChips.length) return;

  routeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      routeChips.forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      selectedRoute = chip.dataset.route || chip.textContent.trim();
      updateMonetisationUI(getStoredRewardBalance(), latestMonthCount, latestLifetimeCount);
    });
  });
}

async function logoutUser() {
  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error("Logout failed:", error);
  }

  window.location.href = "/";
}

function handleDeleteAccount() {
  closeProfileAccountModal();
  showToast("Coming soon", "Account deactivation is not connected yet.");
}

if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    await triggerAd();
    openUploadModal();
  });
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
    if (modalConfirmBtn) modalConfirmBtn.disabled = false;
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

if (accountActionBtn) {
  accountActionBtn.addEventListener("click", openAccountModal);
}

if (closeAccountModal) {
  closeAccountModal.addEventListener("click", closeProfileAccountModal);
}

if (accountModal) {
  accountModal.addEventListener("click", (event) => {
    if (event.target === accountModal) {
      closeProfileAccountModal();
    }
  });
}

if (modalLogout) {
  modalLogout.addEventListener("click", logoutUser);
}

if (modalDelete) {
  modalDelete.addEventListener("click", handleDeleteAccount);
}

(async function initApp() {
  setupNavigation();
  setupRouteChips();

  const ok = await requireLogin();
  if (!ok) return;

  await ensureAdScriptLoaded();
  await updateUploadStatsUI();
})();

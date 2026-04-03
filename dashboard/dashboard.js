const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const BUCKET_NAME = "user-images";
const DAILY_LIMIT = 50;
const AD_BONUS_LIMIT = 15;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

let currentUser = null;
let selectedFile = null;
let previewURL = null;
let todayExtraLimit = 0;

function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailyBonusStorageKey() {
  if (!currentUser) return "daily_bonus_guest";
  return `daily_bonus_${currentUser.id}`;
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
  } catch {
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
  return true;
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

function updateProgressUI(todayCount, monthCount) {
  const currentLimit = getCurrentDailyLimit();
  const percent = Math.min((todayCount / currentLimit) * 100, 100);

  if (todayCountEl) todayCountEl.textContent = todayCount;
  if (monthCountEl) monthCountEl.textContent = monthCount;
  if (progressTextEl) progressTextEl.textContent = `${todayCount} / ${currentLimit}`;
  if (progressFillEl) progressFillEl.style.width = `${percent}%`;

  let badgeText = "New Day";
  let noteText = "Start your first upload and begin building today’s progress.";

  if (todayCount > 0 && percent < 30) {
    badgeText = "Starting";
    noteText = "You’re just getting started today.";
  } else if (percent >= 30 && percent < 70) {
    badgeText = "Active";
    noteText = "Nice progress today. Keep uploading to build more momentum.";
  } else if (percent >= 70 && percent < 100) {
    badgeText = "Hot";
    noteText = "You’re getting close to today’s upload limit.";
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
  const todayCount = await getTodayUploadCount();
  const monthCount = await getMonthUploadCount();
  updateProgressUI(todayCount, monthCount);
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

async function handleUpload(file) {
  if (!currentUser) {
    alert("Please login again.");
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

    const { error: uploadError } = await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      alert("Upload failed.");
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
      alert("Upload saved in storage, but database record failed.");
      return false;
    }

    const { error: deleteStorageError } = await supabaseClient
      .storage
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
    alert("Image uploaded successfully.");
    return true;
  } catch (error) {
    console.error("Upload error:", error);
    alert("Something went wrong during upload.");
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
  watchAdBtn.textContent = "Processing...";

  if (limitStatusText) {
    limitStatusText.textContent = "Ad completed. Daily limit increased by 15 for today.";
  }

  todayExtraLimit += AD_BONUS_LIMIT;
  saveTodayExtraLimit();
  await updateUploadStatsUI();

  setTimeout(() => {
    watchAdBtn.disabled = false;
    watchAdBtn.textContent = "Watch Ad to Increase Limit";
    closeLimitModal();
  }, 1000);
}

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

(async function initDashboard() {
  const ok = await requireLogin();
  if (!ok) return;
  await updateUploadStatsUI();
})();

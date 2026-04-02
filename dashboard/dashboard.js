const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";
const BUCKET_NAME = "user-images";
const DAILY_LIMIT = 50;
const AD_BONUS_LIMIT = 25;

const CONTACT_EMAIL = "support@eanova.online";
const INSTAGRAM_HANDLE = "";

let bankTransferMode = "disabled";
let currentPayoutMode = "giftcard";

const MINIMUM_PAYOUT_USD = 10;
const CLAIM_API_URL = "https://imagetest2.onrender.com/api/debug-user";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const howItWorksModal = document.getElementById("howItWorksModal");
const closeHowItWorksBtn = document.getElementById("closeHowItWorksBtn");
const gotItHowItWorksBtn = document.getElementById("gotItHowItWorksBtn");
const openHowItWorksPageBtn = document.getElementById("openHowItWorksPageBtn");
const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
const profileEmail = document.getElementById("profileEmail");
const dashboardUserName = document.getElementById("dashboardUserName");

const profileNameInput = document.getElementById("profileName");
const countryInput = document.getElementById("profileCountry");

const businessEmailLink = document.getElementById("businessEmailLink");
const businessEmailText = document.getElementById("businessEmailText");
const businessInstagramLink = document.getElementById("businessInstagramLink");
const businessInstagramText = document.getElementById("businessInstagramText");

const currencySelect = document.getElementById("currencySelect");
const currencyProfileSelect = document.getElementById("currencyProfileSelect");

const todayUploadCountEl = document.getElementById("todayUploadCount");
const todayUploadCountMirror = document.getElementById("todayUploadCountMirror");
const monthUploadCountEl = document.getElementById("monthUploadCount");

const totalEarnedValue = document.getElementById("totalEarnedValue");
const pendingEarnedValue = document.getElementById("pendingEarnedValue");
const paidEarnedValue = document.getElementById("paidEarnedValue");
const claimableBalance = document.getElementById("claimableBalance");
const minimumPayoutValue = document.getElementById("minimumPayoutValue");

const payoutAccessMessage = document.getElementById("payoutAccessMessage");
const currentPayoutRoute = document.getElementById("currentPayoutRoute");
const bankTransferStatus = document.getElementById("bankTransferStatus");
const claimGiftCardBtn = document.getElementById("claimGiftCardBtn");
const bankTransferActionBtn = document.getElementById("bankTransferActionBtn");

const uploadModal = document.getElementById("uploadModal");
const openUploadBtn = document.getElementById("openUploadBtn");
const closeUploadBtn = document.getElementById("closeUploadBtn");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const imageInput = document.getElementById("imageInput");
const previewWrap = document.getElementById("previewWrap");
const previewImage = document.getElementById("previewImage");
const confirmUploadBtn = document.getElementById("confirmUploadBtn");

const limitModal = document.getElementById("limitModal");
const closeLimitBtn = document.getElementById("closeLimitBtn");
const watchAdBtn = document.getElementById("watchAdBtn");
const limitStatusText = document.getElementById("limitStatusText");

const uploadProgressBar = document.getElementById("uploadProgressBar");
const uploadProgressText = document.getElementById("uploadProgressText");
const uploadProgressNote = document.getElementById("uploadProgressNote");
const uploadStatusBadge = document.getElementById("uploadStatusBadge");
const dailyLimitValue = document.getElementById("dailyLimitValue");
const mobileUploadBtn = document.getElementById("mobileUploadBtn");

let currentUser = null;
let selectedFile = null;
let currentCurrency = "USD";
let todayExtraLimit = 0;
let profileSaveTimer = null;
let settingsSaveTimer = null;

function currencySymbol(code) {
  const map = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    GBP: "£"
  };
  return map[code] || "$";
}

function money(value) {
  return `${currencySymbol(currentCurrency)}${Number(value || 0).toFixed(2)}`;
}

function animateValue(element, finalValue) {
  if (!element) return;
  const target = Number(finalValue || 0);
  const startTime = performance.now();
  const duration = 700;

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    element.textContent = money(value);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = money(target);
    }
  }

  requestAnimationFrame(tick);
}

function updatePayoutButtons() {
  if (claimGiftCardBtn) {
    claimGiftCardBtn.textContent = "Claim Reward";
    claimGiftCardBtn.disabled = currentPayoutMode !== "giftcard";
  }

  if (bankTransferActionBtn) {
    if (bankTransferMode === "switch") {
      bankTransferActionBtn.textContent = "Switch";
      bankTransferActionBtn.disabled = false;
    } else {
      bankTransferActionBtn.textContent = "Disabled";
      bankTransferActionBtn.disabled = true;
    }
  }
}

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

function getStartOfTodayISO() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function getStartOfMonthISO() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

async function getTodayUploadCount() {
  if (!currentUser) return 0;

  const { count, error } = await supabaseClient
    .from("images")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id)
    .gte("created_at", getStartOfTodayISO());

  if (error) {
    console.error("Today count error:", error);
    return 0;
  }

  return count || 0;
}

async function getMonthUploadCount() {
  if (!currentUser) return 0;

  const { count, error } = await supabaseClient
    .from("images")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id)
    .gte("created_at", getStartOfMonthISO());

  if (error) {
    console.error("Month count error:", error);
    return 0;
  }

  return count || 0;
}

function getCurrentDailyLimit() {
  return DAILY_LIMIT + todayExtraLimit;
}

function updateProgressUI(todayCount, monthCount) {
  const currentLimit = getCurrentDailyLimit();
  const safeLimit = currentLimit > 0 ? currentLimit : DAILY_LIMIT;
  const percent = Math.min((todayCount / safeLimit) * 100, 100);

  if (todayUploadCountEl) todayUploadCountEl.textContent = todayCount;
  if (todayUploadCountMirror) todayUploadCountMirror.textContent = todayCount;
  if (monthUploadCountEl) monthUploadCountEl.textContent = monthCount;
  if (dailyLimitValue) dailyLimitValue.textContent = safeLimit;
  if (uploadProgressText) uploadProgressText.textContent = `${todayCount} / ${safeLimit}`;
  if (uploadProgressBar) uploadProgressBar.style.width = `${percent}%`;

  let badgeText = "Starting";
  let noteText = "You’re just getting started today.";

  if (todayCount === 0) {
    badgeText = "New Day";
    noteText = "Start your first upload and begin building today’s progress.";
  } else if (percent < 30) {
    badgeText = "Growing";
    noteText = "Nice start. Keep uploading to build momentum.";
  } else if (percent < 70) {
    badgeText = "Active";
    noteText = "Strong progress today. You’re building steady activity.";
  } else if (percent < 100) {
    badgeText = "Hot";
    noteText = "You’re close to today’s limit. Keep going.";
  } else {
    badgeText = "Limit Reached";
    noteText = "You hit today’s cap. Watch an ad to unlock more uploads.";
  }

  if (uploadStatusBadge) uploadStatusBadge.textContent = badgeText;
  if (uploadProgressNote) uploadProgressNote.textContent = noteText;
}

async function updateUploadStatsUI() {
  if (!currentUser) return;

  const todayCount = await getTodayUploadCount();
  const monthCount = await getMonthUploadCount();
  updateProgressUI(todayCount, monthCount);
}

function openLimitModal() {
  if (!limitStatusText || !limitModal) return;
  limitStatusText.textContent = "";
  limitModal.classList.remove("hidden");
}

function closeLimitModal() {
  if (!limitModal) return;
  limitModal.classList.add("hidden");
}

function openHowItWorksModal() {
  if (!howItWorksModal) return;
  howItWorksModal.classList.remove("hidden");
}

function closeHowItWorksModal() {
  if (!howItWorksModal) return;
  howItWorksModal.classList.add("hidden");
}

async function ensureProfile() {
  const { data: existing, error: fetchError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (fetchError) {
    console.error("Profile fetch error:", fetchError);
    return;
  }

  if (!existing) {
    const { error: insertError } = await supabaseClient
      .from("profiles")
      .insert({
        id: currentUser.id,
        email: currentUser.email,
        name: "",
        profile_description: "",
        currency: "USD"
      });

    if (insertError) {
      console.error("Profile create error:", insertError);
      return;
    }

    if (profileNameInput) profileNameInput.value = "";
    currentCurrency = "USD";
    if (currencySelect) currencySelect.value = "USD";
    if (currencyProfileSelect) currencyProfileSelect.value = "USD";
    if (dashboardUserName) dashboardUserName.textContent = "Creator";
    return;
  }

  if (profileNameInput) profileNameInput.value = existing.name || "";
  currentCurrency = existing.currency || "USD";
  if (currencySelect) currencySelect.value = currentCurrency;
  if (currencyProfileSelect) currencyProfileSelect.value = currentCurrency;
  if (dashboardUserName) {
    dashboardUserName.textContent =
      existing.name && existing.name.trim() ? existing.name.trim() : "Creator";
  }
}

async function saveProfileFields() {
  if (!currentUser) return;

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      email: currentUser.email,
      name: profileNameInput ? profileNameInput.value.trim() : "",
      currency: currencySelect ? currencySelect.value : currentCurrency
    })
    .eq("id", currentUser.id);

  if (error) {
    console.error("Save profile error:", error);
  } else {
    currentCurrency = currencySelect ? currencySelect.value : currentCurrency;
    if (dashboardUserName) {
      dashboardUserName.textContent =
        profileNameInput && profileNameInput.value.trim()
          ? profileNameInput.value.trim()
          : "Creator";
    }
    await loadEarnings();
  }
}

function scheduleProfileSave() {
  clearTimeout(profileSaveTimer);
  profileSaveTimer = setTimeout(saveProfileFields, 500);
}

async function ensureBasicSettings() {
  const { data: existing, error } = await supabaseClient
    .from("payout_methods")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Basic settings fetch error:", error);
    return;
  }

  if (!existing) {
    const { error: insertError } = await supabaseClient
      .from("payout_methods")
      .insert({
        user_id: currentUser.id,
        country: "",
        payout_method: "giftcard",
        paypal_email: "",
        bank_transfer_enabled: false,
        payout_access_message:
          "Rewards are sent to your email after a successful claim."
      });

    if (insertError) {
      console.error("Basic settings create error:", insertError);
      return;
    }

    if (countryInput) countryInput.value = "";
    updatePayoutAccessUI({
      payout_access_message: "Rewards are sent to your email after a successful claim."
    });
    return;
  }

  if (countryInput) countryInput.value = existing.country || "";
  updatePayoutAccessUI(existing);
}

function updatePayoutAccessUI(data) {
  const accessMessage =
    data?.payout_access_message ||
    "Rewards are sent to your email after a successful claim.";

  if (payoutAccessMessage) payoutAccessMessage.textContent = accessMessage;
  if (currentPayoutRoute) {
    currentPayoutRoute.textContent =
      currentPayoutMode === "bank" ? "Bank Transfer" : "Gift Card";
  }
  if (bankTransferStatus) {
    bankTransferStatus.textContent =
      bankTransferMode === "switch" ? "Available" : "Ready";
  }

  updatePayoutButtons();
}

async function saveBasicSettings() {
  if (!currentUser) return;

  const { error } = await supabaseClient
    .from("payout_methods")
    .update({
      country: countryInput ? countryInput.value.trim() : "",
      updated_at: new Date().toISOString()
    })
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Save settings error:", error);
  }
}

function scheduleSettingsSave() {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(saveBasicSettings, 500);
}

function loadContactPlaceholders() {
  const emailText = CONTACT_EMAIL && CONTACT_EMAIL.trim()
    ? CONTACT_EMAIL.trim()
    : "Add later in code";

  const igText = INSTAGRAM_HANDLE && INSTAGRAM_HANDLE.trim()
    ? INSTAGRAM_HANDLE.trim()
    : "@yourhandle";

  if (businessEmailText) {
    businessEmailText.textContent = emailText;
  }

  if (businessEmailLink) {
    businessEmailLink.href = CONTACT_EMAIL && CONTACT_EMAIL.trim()
      ? `mailto:${CONTACT_EMAIL.trim()}`
      : "mailto:";
  }

  if (businessInstagramText) {
    businessInstagramText.textContent = igText;
  }

  if (businessInstagramLink) {
    const cleanHandle = igText.replace(/^@/, "").trim();
    businessInstagramLink.href =
      cleanHandle && cleanHandle !== "yourhandle"
        ? `https://instagram.com/${cleanHandle}`
        : "#";
  }
}

async function loadEarnings() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("creator_earnings")
    .select("amount,status")
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Earnings load error:", error);
    if (totalEarnedValue) totalEarnedValue.textContent = money(0);
    if (pendingEarnedValue) pendingEarnedValue.textContent = money(0);
    if (paidEarnedValue) paidEarnedValue.textContent = money(0);
    if (claimableBalance) claimableBalance.textContent = money(0);
    if (minimumPayoutValue) minimumPayoutValue.textContent = money(MINIMUM_PAYOUT_USD);
    return;
  }

  let total = 0;
  let pending = 0;
  let fulfilled = 0;

  (data || []).forEach((row) => {
    const amount = Number(row.amount || 0);
    total += amount;

    if (row.status === "paid" || row.status === "fulfilled") {
      fulfilled += amount;
    } else {
      pending += amount;
    }
  });

  if (totalEarnedValue) animateValue(totalEarnedValue, total);
  if (pendingEarnedValue) animateValue(pendingEarnedValue, pending);
  if (paidEarnedValue) animateValue(paidEarnedValue, fulfilled);
  if (claimableBalance) claimableBalance.textContent = money(pending);
  if (minimumPayoutValue) minimumPayoutValue.textContent = money(MINIMUM_PAYOUT_USD);
}

async function deleteAccountData() {
  if (!currentUser) return;

  const confirmed = window.confirm(
    "This will delete your app data from the database and log you out. Continue?"
  );

  if (!confirmed) return;

  if (deleteAccountBtn) {
    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = "Deleting...";
  }

  try {
    const { error: deleteImagesError } = await supabaseClient
      .from("images")
      .delete()
      .eq("user_id", currentUser.id);

    if (deleteImagesError) throw deleteImagesError;

    const { error: deleteEarningsError } = await supabaseClient
      .from("creator_earnings")
      .delete()
      .eq("user_id", currentUser.id);

    if (deleteEarningsError) throw deleteEarningsError;

    const { error: deletePayoutError } = await supabaseClient
      .from("payout_methods")
      .delete()
      .eq("user_id", currentUser.id);

    if (deletePayoutError) throw deletePayoutError;

    const { error: deleteProfileError } = await supabaseClient
      .from("profiles")
      .delete()
      .eq("id", currentUser.id);

    if (deleteProfileError) throw deleteProfileError;

    await supabaseClient.auth.signOut();
    window.location.href = "/";
  } catch (error) {
    console.error("Delete account data error:", error);
    alert("Could not delete account data.");
    if (deleteAccountBtn) {
      deleteAccountBtn.disabled = false;
      deleteAccountBtn.textContent = "Delete Account Data";
    }
  }
}

async function requireLogin() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "/";
    return;
  }

  currentUser = data.user;
  if (profileEmail) profileEmail.textContent = currentUser.email;

  loadTodayExtraLimit();
  loadContactPlaceholders();

  await ensureProfile();
  await ensureBasicSettings();
  await loadEarnings();
  await updateUploadStatsUI();

  updatePayoutButtons();
}

function resetUploadModal() {
  selectedFile = null;
  if (imageInput) imageInput.value = "";
  if (previewImage) previewImage.src = "";
  if (previewWrap) previewWrap.classList.add("hidden");
}

function openUploadModal() {
  resetUploadModal();
  if (uploadModal) uploadModal.classList.remove("hidden");
}

function closeUploadModal() {
  if (uploadModal) uploadModal.classList.add("hidden");
  resetUploadModal();
}

async function uploadSelectedImage() {
  if (!currentUser) {
    alert("Please login again.");
    return;
  }

  const todayCount = await getTodayUploadCount();
  const currentLimit = getCurrentDailyLimit();

  if (todayCount >= currentLimit) {
    openLimitModal();
    return;
  }

  if (!selectedFile) {
    alert("Please choose an image first.");
    return;
  }

  if (confirmUploadBtn) {
    confirmUploadBtn.textContent = "Uploading...";
    confirmUploadBtn.disabled = true;
  }

  try {
    const fileExt = selectedFile.name.split(".").pop();
    const cleanExt = fileExt ? fileExt.toLowerCase() : "jpg";
    const filePath = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${cleanExt}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type
      });

    if (uploadError) {
      alert("Storage upload error: " + uploadError.message);
      throw uploadError;
    }

    const { data: publicData } = supabaseClient
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const { error: insertError } = await supabaseClient
      .from("images")
      .insert({
        user_id: currentUser.id,
        file_path: filePath,
        public_url: publicData.publicUrl,
        description: ""
      });

    if (insertError) {
      alert("Database insert error: " + insertError.message);
      throw insertError;
    }

    const { error: deleteStorageError } = await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (deleteStorageError) {
      console.error("Auto delete storage error:", deleteStorageError);
    }

    closeUploadModal();
    await updateUploadStatsUI();
    await loadEarnings();
    alert("Image uploaded successfully.");
  } catch (err) {
    console.error("Upload error:", err);
  } finally {
    if (confirmUploadBtn) {
      confirmUploadBtn.textContent = "Confirm Upload";
      confirmUploadBtn.disabled = false;
    }
  }
}

async function simulateWatchAdAndIncreaseLimit() {
  if (!watchAdBtn || !limitStatusText) return;

  watchAdBtn.disabled = true;
  watchAdBtn.textContent = "Processing...";
  limitStatusText.textContent = "Ad completed. Daily limit increased for today.";

  todayExtraLimit += AD_BONUS_LIMIT;
  saveTodayExtraLimit();
  await updateUploadStatsUI();

  setTimeout(() => {
    watchAdBtn.disabled = false;
    watchAdBtn.textContent = "Watch Ad to Increase Limit";
    closeLimitModal();
  }, 1200);
}

async function claimReward() {
  if (!currentUser) {
    alert("Please login again.");
    return;
  }

  if (CLAIM_API_URL.includes("YOUR-RENDER-URL")) {
    alert("Add your real Render backend URL in dashboard.js first.");
    return;
  }

  try {
    claimGiftCardBtn.disabled = true;
    claimGiftCardBtn.textContent = "Processing...";

    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data?.session?.access_token) {
      throw new Error("Could not get user session.");
    }

    const response = await fetch(CLAIM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + data.session.access_token
      }
    });

    const rawText = await response.text();

    let result;
    try {
      result = JSON.parse(rawText);
    } catch {
      console.error("Non-JSON response:", rawText);
      throw new Error("Backend returned HTML instead of JSON");
    }

    if (!response.ok) {
      throw new Error(result.error || "Claim failed");
    }

    alert("Reward claim submitted. Check your email.");
    await loadEarnings();
  } catch (err) {
    console.error("Claim error:", err);
    alert(err.message || "Could not submit claim.");
  } finally {
    claimGiftCardBtn.disabled = false;
    claimGiftCardBtn.textContent = "Claim Reward";
  }
}

if (profileBtn) {
  profileBtn.addEventListener("click", function () {
    if (profileModal) profileModal.classList.remove("hidden");
  });
}

if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", function () {
    if (profileModal) profileModal.classList.add("hidden");
  });
}

if (profileModal) {
  profileModal.addEventListener("click", function (e) {
    if (e.target === profileModal) {
      profileModal.classList.add("hidden");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();
    window.location.href = "/";
  });
}

if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", deleteAccountData);
}

if (claimGiftCardBtn) {
  claimGiftCardBtn.addEventListener("click", claimReward);
}

if (bankTransferActionBtn) {
  bankTransferActionBtn.addEventListener("click", function () {
    if (bankTransferMode !== "switch") return;

    currentPayoutMode = currentPayoutMode === "giftcard" ? "bank" : "giftcard";
    updatePayoutAccessUI({});
    alert(
      "Payout route switched to " +
      (currentPayoutMode === "bank" ? "Bank Transfer" : "Gift Card") +
      "."
    );
  });
}

if (openUploadBtn) {
  openUploadBtn.addEventListener("click", openUploadModal);
}

if (mobileUploadBtn) {
  mobileUploadBtn.addEventListener("click", openUploadModal);
}

if (closeUploadBtn) {
  closeUploadBtn.addEventListener("click", closeUploadModal);
}

if (uploadModal) {
  uploadModal.addEventListener("click", function (e) {
    if (e.target === uploadModal) {
      closeUploadModal();
    }
  });
}

if (chooseFileBtn) {
  chooseFileBtn.addEventListener("click", function () {
    if (imageInput) imageInput.click();
  });
}

if (imageInput) {
  imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];
    if (!file) return;

    selectedFile = file;
    if (previewImage) previewImage.src = URL.createObjectURL(file);
    if (previewWrap) previewWrap.classList.remove("hidden");
  });
}

if (profileNameInput) {
  profileNameInput.addEventListener("input", scheduleProfileSave);
}

if (countryInput) {
  countryInput.addEventListener("input", scheduleSettingsSave);
}

if (currencySelect) {
  currencySelect.addEventListener("change", function () {
    currentCurrency = currencySelect.value;
    if (currencyProfileSelect) currencyProfileSelect.value = currencySelect.value;
    scheduleProfileSave();
    loadEarnings();
  });
}

if (currencyProfileSelect) {
  currencyProfileSelect.addEventListener("change", function () {
    currentCurrency = currencyProfileSelect.value;
    if (currencySelect) currencySelect.value = currencyProfileSelect.value;
    scheduleProfileSave();
    loadEarnings();
  });
}

if (closeLimitBtn) {
  closeLimitBtn.addEventListener("click", closeLimitModal);
}

if (limitModal) {
  limitModal.addEventListener("click", function (e) {
    if (e.target === limitModal) {
      closeLimitModal();
    }
  });
}

if (watchAdBtn) {
  watchAdBtn.addEventListener("click", simulateWatchAdAndIncreaseLimit);
}

if (confirmUploadBtn) {
  confirmUploadBtn.addEventListener("click", uploadSelectedImage);
}

if (closeHowItWorksBtn) {
  closeHowItWorksBtn.addEventListener("click", closeHowItWorksModal);
}

if (gotItHowItWorksBtn) {
  gotItHowItWorksBtn.addEventListener("click", () => {
    localStorage.setItem("eanovaHowItWorksSeen", "true");
    closeHowItWorksModal();
  });
}

if (openHowItWorksPageBtn) {
  openHowItWorksPageBtn.addEventListener("click", function () {
    window.location.href = "/how-it-works/";
  });
}

window.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    if (profileModal && !profileModal.classList.contains("hidden")) {
      profileModal.classList.add("hidden");
    }
    if (uploadModal && !uploadModal.classList.contains("hidden")) {
      closeUploadModal();
    }
    if (limitModal && !limitModal.classList.contains("hidden")) {
      closeLimitModal();
    }
    if (howItWorksModal && !howItWorksModal.classList.contains("hidden")) {
      closeHowItWorksModal();
    }
  }
});

requireLogin().then(() => {
  const alreadySeen = localStorage.getItem("eanovaHowItWorksSeen");
  if (!alreadySeen) {
    openHowItWorksModal();
  }
});

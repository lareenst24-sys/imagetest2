const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const BUCKET_NAME = "user-images";
const DAILY_LIMIT = 250;
const AD_BONUS_LIMIT = 25;

const EARNINGS_MESSAGES = [
  "The amount displayed is not final, as additional amounts may be added based on the assessment of the images.",
  "We will email you when you are eligible for bank transfer."
];

let bankTransferMode = "disabled";
let currentPayoutMode = "giftcard";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
const profileEmail = document.getElementById("profileEmail");
const dashboardUserName = document.getElementById("dashboardUserName");

const profileNameInput = document.getElementById("profileName");
const countryInput = document.getElementById("profileCountry");

const currencySelect = document.getElementById("currencySelect");
const currencyProfileSelect = document.getElementById("currencyProfileSelect");

const todayUploadCountEl = document.getElementById("todayUploadCount");
const monthUploadCountEl = document.getElementById("monthUploadCount");

const totalEarnedValue = document.getElementById("totalEarnedValue");
const pendingEarnedValue = document.getElementById("pendingEarnedValue");
const paidEarnedValue = document.getElementById("paidEarnedValue");

const payoutAccessMessage = document.getElementById("payoutAccessMessage");
const currentPayoutRoute = document.getElementById("currentPayoutRoute");
const bankTransferStatus = document.getElementById("bankTransferStatus");
const claimGiftCardBtn = document.getElementById("claimGiftCardBtn");
const bankTransferActionBtn = document.getElementById("bankTransferActionBtn");
const earningsMessageList = document.getElementById("earningsMessageList");

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

function renderEarningsMessages() {
  if (!earningsMessageList) return;

  earningsMessageList.innerHTML = "";

  EARNINGS_MESSAGES.forEach((message) => {
    const item = document.createElement("div");
    item.className = "earnings-message-item";
    item.textContent = "• " + message;
    earningsMessageList.appendChild(item);
  });
}

function updatePayoutButtons() {
  if (claimGiftCardBtn) {
    claimGiftCardBtn.textContent = "Claim";
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

async function updateUploadStatsUI() {
  if (!currentUser) return;

  const todayCount = await getTodayUploadCount();
  const monthCount = await getMonthUploadCount();

  todayUploadCountEl.textContent = todayCount;
  monthUploadCountEl.textContent = monthCount;
}

function getCurrentDailyLimit() {
  return DAILY_LIMIT + todayExtraLimit;
}

function openLimitModal() {
  limitStatusText.textContent = "";
  limitModal.classList.remove("hidden");
}

function closeLimitModal() {
  limitModal.classList.add("hidden");
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

    profileNameInput.value = "";
    currentCurrency = "USD";
    currencySelect.value = "USD";
    currencyProfileSelect.value = "USD";
    dashboardUserName.textContent = "Creator";
    return;
  }

  profileNameInput.value = existing.name || "";
  currentCurrency = existing.currency || "USD";
  currencySelect.value = currentCurrency;
  currencyProfileSelect.value = currentCurrency;
  dashboardUserName.textContent = existing.name && existing.name.trim() ? existing.name.trim() : "Creator";
}

async function saveProfileFields() {
  if (!currentUser) return;

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      email: currentUser.email,
      name: profileNameInput.value.trim(),
      currency: currencySelect.value
    })
    .eq("id", currentUser.id);

  if (error) {
    console.error("Save profile error:", error);
  } else {
    currentCurrency = currencySelect.value;
    dashboardUserName.textContent = profileNameInput.value.trim() || "Creator";
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
          "You are currently receiving gift card payouts. After you complete the required time period or sales target, you may become eligible for additional payout options later."
      });

    if (insertError) {
      console.error("Basic settings create error:", insertError);
      return;
    }

    countryInput.value = "";
    updatePayoutAccessUI({
      payout_access_message:
        "You are currently receiving gift card payouts. After you complete the required time period or sales target, you may become eligible for additional payout options later."
    });
    return;
  }

  countryInput.value = existing.country || "";
  updatePayoutAccessUI(existing);
}

function updatePayoutAccessUI(data) {
  const accessMessage =
    data?.payout_access_message ||
    "You are currently receiving gift card payouts. After you complete the required time period or sales target, you may become eligible for additional payout options later.";

  payoutAccessMessage.textContent = accessMessage;
  currentPayoutRoute.textContent = currentPayoutMode === "bank" ? "Bank Transfer" : "Gift Card";
  bankTransferStatus.textContent = bankTransferMode === "switch" ? "Available" : "Blocked";

  updatePayoutButtons();
}

async function saveBasicSettings() {
  if (!currentUser) return;

  const { error } = await supabaseClient
    .from("payout_methods")
    .update({
      country: countryInput.value.trim(),
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

async function loadEarnings() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("creator_earnings")
    .select("amount,status")
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Earnings load error:", error);
    totalEarnedValue.textContent = money(0);
    pendingEarnedValue.textContent = money(0);
    paidEarnedValue.textContent = money(0);
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

  totalEarnedValue.textContent = money(total);
  pendingEarnedValue.textContent = money(pending);
  paidEarnedValue.textContent = money(fulfilled);
}

async function deleteAccountData() {
  if (!currentUser) return;

  const confirmed = window.confirm(
    "This will delete your app data from the database and log you out. Continue?"
  );

  if (!confirmed) return;

  deleteAccountBtn.disabled = true;
  deleteAccountBtn.textContent = "Deleting...";

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
    window.location.href = "index.html";
  } catch (error) {
    console.error("Delete account data error:", error);
    alert("Could not delete account data.");
    deleteAccountBtn.disabled = false;
    deleteAccountBtn.textContent = "Delete Account Data";
  }
}

async function requireLogin() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = data.user;
  profileEmail.textContent = currentUser.email;

  loadTodayExtraLimit();

  await ensureProfile();
  await ensureBasicSettings();
  await loadEarnings();
  await updateUploadStatsUI();

  renderEarningsMessages();
  updatePayoutButtons();
}

function resetUploadModal() {
  selectedFile = null;
  imageInput.value = "";
  previewImage.src = "";
  previewWrap.classList.add("hidden");
}

function openUploadModal() {
  resetUploadModal();
  uploadModal.classList.remove("hidden");
}

function closeUploadModal() {
  uploadModal.classList.add("hidden");
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

  confirmUploadBtn.textContent = "Uploading...";
  confirmUploadBtn.disabled = true;

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
    alert("Image uploaded successfully.");
  } catch (err) {
    console.error("Upload error:", err);
  } finally {
    confirmUploadBtn.textContent = "Confirm Upload";
    confirmUploadBtn.disabled = false;
  }
}

async function simulateWatchAdAndIncreaseLimit() {
  watchAdBtn.disabled = true;
  watchAdBtn.textContent = "Processing...";
  limitStatusText.textContent = "Ad completed. Daily limit increased for today.";

  todayExtraLimit += AD_BONUS_LIMIT;
  saveTodayExtraLimit();

  setTimeout(() => {
    watchAdBtn.disabled = false;
    watchAdBtn.textContent = "Watch Ad to Increase Limit";
    closeLimitModal();
  }, 1200);
}

profileBtn.addEventListener("click", function () {
  profileModal.classList.remove("hidden");
});

closeProfileBtn.addEventListener("click", function () {
  profileModal.classList.add("hidden");
});

profileModal.addEventListener("click", function (e) {
  if (e.target === profileModal) {
    profileModal.classList.add("hidden");
  }
});

logoutBtn.addEventListener("click", async function () {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

deleteAccountBtn.addEventListener("click", deleteAccountData);

if (claimGiftCardBtn) {
  claimGiftCardBtn.addEventListener("click", function () {
    if (currentPayoutMode !== "giftcard") return;
    alert("Gift card claim request submitted.");
  });
}

if (bankTransferActionBtn) {
  bankTransferActionBtn.addEventListener("click", function () {
    if (bankTransferMode !== "switch") return;

    currentPayoutMode = currentPayoutMode === "giftcard" ? "bank" : "giftcard";
    updatePayoutAccessUI({});
    alert("Payout route switched to " + (currentPayoutMode === "bank" ? "Bank Transfer" : "Gift Card") + ".");
  });
}

openUploadBtn.addEventListener("click", openUploadModal);
closeUploadBtn.addEventListener("click", closeUploadModal);

uploadModal.addEventListener("click", function (e) {
  if (e.target === uploadModal) {
    closeUploadModal();
  }
});

chooseFileBtn.addEventListener("click", function () {
  imageInput.click();
});

imageInput.addEventListener("change", function () {
  const file = imageInput.files[0];
  if (!file) return;

  selectedFile = file;
  previewImage.src = URL.createObjectURL(file);
  previewWrap.classList.remove("hidden");
});

profileNameInput.addEventListener("input", scheduleProfileSave);
countryInput.addEventListener("input", scheduleSettingsSave);

currencySelect.addEventListener("change", function () {
  currentCurrency = currencySelect.value;
  currencyProfileSelect.value = currencySelect.value;
  scheduleProfileSave();
  loadEarnings();
});

currencyProfileSelect.addEventListener("change", function () {
  currentCurrency = currencyProfileSelect.value;
  currencySelect.value = currencyProfileSelect.value;
  scheduleProfileSave();
  loadEarnings();
});

closeLimitBtn.addEventListener("click", closeLimitModal);

limitModal.addEventListener("click", function (e) {
  if (e.target === limitModal) {
    closeLimitModal();
  }
});

watchAdBtn.addEventListener("click", simulateWatchAdAndIncreaseLimit);

confirmUploadBtn.addEventListener("click", uploadSelectedImage);

requireLogin();

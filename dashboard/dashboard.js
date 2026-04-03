const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";
const BUCKET_NAME = "user-images";
const DAILY_LIMIT = 50;
const AD_BONUS_LIMIT = 25;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

const progressCountEl = document.getElementById("progressCount");
const todayCountEl = document.getElementById("todayCount");
const monthCountEl = document.getElementById("monthCount");
const progressFillEl = document.getElementById("progressFill");

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("Error getting user:", error.message);
    return null;
  }
  return data.user;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

async function loadCounts() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "/";
    return;
  }

  const todayRange = getTodayRange();
  const monthRange = getMonthRange();

  const { count: todayCount, error: todayError } = await supabaseClient
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayRange.start)
    .lt("created_at", todayRange.end);

  const { count: monthCount, error: monthError } = await supabaseClient
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthRange.start)
    .lt("created_at", monthRange.end);

  if (todayError) {
    console.error("Today count error:", todayError.message);
  }

  if (monthError) {
    console.error("Month count error:", monthError.message);
  }

  const safeTodayCount = todayCount || 0;
  const safeMonthCount = monthCount || 0;

  if (progressCountEl) {
    progressCountEl.textContent = safeTodayCount;
  }

  if (todayCountEl) {
    todayCountEl.textContent = safeTodayCount;
  }

  if (monthCountEl) {
    monthCountEl.textContent = safeMonthCount;
  }

  if (progressFillEl) {
    const percentage = Math.min((safeTodayCount / DAILY_LIMIT) * 100, 100);
    progressFillEl.style.width = `${percentage}%`;
  }
}

async function handleUpload(file) {
  const user = await getCurrentUser();
  if (!user) {
    alert("You must be logged in.");
    window.location.href = "/";
    return;
  }

  const todayRange = getTodayRange();

  const { count: todayCount, error: countError } = await supabaseClient
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayRange.start)
    .lt("created_at", todayRange.end);

  if (countError) {
    alert("Could not check daily limit.");
    console.error(countError.message);
    return;
  }

  if ((todayCount || 0) >= DAILY_LIMIT) {
    alert("Daily upload limit reached.");
    return;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(fileName, file);

  if (uploadError) {
    alert("Upload failed.");
    console.error(uploadError.message);
    return;
  }

  const { error: insertError } = await supabaseClient
    .from("uploads")
    .insert({
      user_id: user.id,
      file_name: fileName,
      storage_deleted: false
    });

  if (insertError) {
    alert("Upload saved in storage, but database record failed.");
    console.error(insertError.message);
    return;
  }

  alert("Upload successful.");
  await loadCounts();
}

if (uploadBtn && fileInput) {
  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    await handleUpload(file);
    fileInput.value = "";
  });
}

loadCounts();

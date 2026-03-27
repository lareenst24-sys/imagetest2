const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAILY_LIMIT = 1000;

const uploadCountEl = document.getElementById("uploadCount");
const imageInput = document.getElementById("imageInput");
const fileNameEl = document.getElementById("fileName");
const uploadBtn = document.getElementById("uploadBtn");
const descriptionInput = document.getElementById("descriptionInput");
const imageGrid = document.getElementById("imageGrid");

const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileEmail = document.getElementById("profileEmail");

let currentUser = null;

function getTodayKey(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return `uploads_${userId}_${today}`;
}

function getUploadCount(userId) {
  return Number(localStorage.getItem(getTodayKey(userId)) || "0");
}

function setUploadCount(userId, count) {
  localStorage.setItem(getTodayKey(userId), String(count));
}

function updateUploadCountUI() {
  if (!currentUser) return;
  const count = getUploadCount(currentUser.id);
  uploadCountEl.textContent = `${count} / ${DAILY_LIMIT}`;
}

function showEmptyStateIfNeeded() {
  if (!imageGrid.children.length) {
    imageGrid.innerHTML = `
      <div class="empty-state">
        <p>No images yet</p>
      </div>
    `;
  }
}

function addImageToGrid(imageUrl, descriptionText = "") {
  const emptyState = imageGrid.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const item = document.createElement("div");
  item.className = "image-item";
  item.innerHTML = `
    <img src="${imageUrl}" alt="Uploaded image">
    <div class="image-caption">${descriptionText || "No description"}</div>
  `;
  imageGrid.prepend(item);
}

function loadSavedImages() {
  if (!currentUser) return;

  const saved = JSON.parse(localStorage.getItem(`gallery_${currentUser.id}`) || "[]");
  imageGrid.innerHTML = "";

  if (!saved.length) {
    showEmptyStateIfNeeded();
    return;
  }

  saved.forEach((item) => {
    addImageToGrid(item.url, item.description);
  });
}

function saveImageRecord(imageUrl, descriptionText) {
  if (!currentUser) return;

  const key = `gallery_${currentUser.id}`;
  const saved = JSON.parse(localStorage.getItem(key) || "[]");

  saved.unshift({
    url: imageUrl,
    description: descriptionText
  });

  localStorage.setItem(key, JSON.stringify(saved));
}

async function requireLogin() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = data.session.user;
  profileEmail.textContent = currentUser.email;
  updateUploadCountUI();
  loadSavedImages();
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

imageInput.addEventListener("change", function () {
  const file = imageInput.files[0];
  fileNameEl.textContent = file ? file.name : "No file selected";
});

uploadBtn.addEventListener("click", async function () {
  if (!currentUser) {
    alert("Please login again.");
    return;
  }

  const count = getUploadCount(currentUser.id);
  if (count >= DAILY_LIMIT) {
    alert("Daily limit reached. Add your ad system here later.");
    return;
  }

  const file = imageInput.files[0];
  if (!file) {
    alert("Please choose an image first.");
    return;
  }

  const descriptionText = descriptionInput.value.trim();

  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;

  try {
    const previewUrl = URL.createObjectURL(file);

    addImageToGrid(previewUrl, descriptionText);
    saveImageRecord(previewUrl, descriptionText);

    setUploadCount(currentUser.id, count + 1);
    updateUploadCountUI();

    imageInput.value = "";
    fileNameEl.textContent = "No file selected";
    descriptionInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Upload failed.");
  } finally {
    uploadBtn.textContent = "Upload Now";
    uploadBtn.disabled = false;
  }
});

requireLogin();

const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";
const BUCKET_NAME = "user-images";
const DAILY_LIMIT = 1000;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const uploadCountEl = document.getElementById("uploadCount");
const imageGrid = document.getElementById("imageGrid");

const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileEmail = document.getElementById("profileEmail");

const profileDescriptionInput = document.getElementById("profileDescriptionInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const uploadModal = document.getElementById("uploadModal");
const openUploadBtn = document.getElementById("openUploadBtn");
const closeUploadBtn = document.getElementById("closeUploadBtn");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const imageInput = document.getElementById("imageInput");
const previewWrap = document.getElementById("previewWrap");
const previewImage = document.getElementById("previewImage");
const imageDescriptionInput = document.getElementById("imageDescriptionInput");
const confirmUploadBtn = document.getElementById("confirmUploadBtn");

let currentUser = null;
let selectedFile = null;

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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function addImageToGrid(imageRow) {
  const emptyState = imageGrid.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const item = document.createElement("div");
  item.className = "image-item";
  item.dataset.imageId = imageRow.id;
  item.dataset.filePath = imageRow.file_path;

  item.innerHTML = `
    <button class="delete-image-btn" title="Delete image">&times;</button>
    <img src="${imageRow.public_url}" alt="Uploaded image">
    <div class="image-caption">${escapeHtml(imageRow.description || "No description")}</div>
  `;

  const deleteBtn = item.querySelector(".delete-image-btn");
  deleteBtn.addEventListener("click", async function (e) {
    e.stopPropagation();
    await deleteImage(imageRow.id, imageRow.file_path, item);
  });

  imageGrid.prepend(item);
}

async function loadImages() {
  if (!currentUser) return;

  imageGrid.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load images error:", error);
    showEmptyStateIfNeeded();
    return;
  }

  if (!data || !data.length) {
    showEmptyStateIfNeeded();
    return;
  }

  data.forEach(addImageToGrid);
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
        profile_description: ""
      });

    if (insertError) {
      console.error("Profile create error:", insertError);
      return;
    }

    profileDescriptionInput.value = "";
    return;
  }

  profileDescriptionInput.value = existing.profile_description || "";
}

async function saveProfileDescription() {
  if (!currentUser) return;

  saveProfileBtn.textContent = "Saving...";
  saveProfileBtn.disabled = true;

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      profile_description: profileDescriptionInput.value.trim(),
      email: currentUser.email
    })
    .eq("id", currentUser.id);

  if (error) {
    console.error("Save profile error:", error);
    alert("Could not save profile description.");
  } else {
    alert("Profile description saved.");
  }

  saveProfileBtn.textContent = "Save Profile";
  saveProfileBtn.disabled = false;
}

async function requireLogin() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = data.user;
  profileEmail.textContent = currentUser.email;

  updateUploadCountUI();
  await ensureProfile();
  await loadImages();
}

function resetUploadModal() {
  selectedFile = null;
  imageInput.value = "";
  previewImage.src = "";
  previewWrap.classList.add("hidden");
  imageDescriptionInput.value = "";
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

  const count = getUploadCount(currentUser.id);
  if (count >= DAILY_LIMIT) {
    alert("Daily limit reached.");
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
      throw uploadError;
    }

    const { data: publicData } = supabaseClient
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    const { data: insertedRows, error: insertError } = await supabaseClient
      .from("images")
      .insert({
        user_id: currentUser.id,
        file_path: filePath,
        public_url: publicUrl,
        description: imageDescriptionInput.value.trim()
      })
      .select();

    if (insertError) {
      throw insertError;
    }

    const newRow = insertedRows[0];
    addImageToGrid(newRow);

    setUploadCount(currentUser.id, count + 1);
    updateUploadCountUI();

    closeUploadModal();
  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed.");
  } finally {
    confirmUploadBtn.textContent = "Confirm Upload";
    confirmUploadBtn.disabled = false;
  }
}

async function deleteImage(imageId, filePath, itemEl) {
  const confirmed = window.confirm("Delete this image?");
  if (!confirmed) return;

  try {
    const { error: storageError } = await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (storageError) {
      throw storageError;
    }

    const { error: dbError } = await supabaseClient
      .from("images")
      .delete()
      .eq("id", imageId);

    if (dbError) {
      throw dbError;
    }

    itemEl.remove();
    showEmptyStateIfNeeded();
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Could not delete image.");
  }
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

saveProfileBtn.addEventListener("click", saveProfileDescription);

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

confirmUploadBtn.addEventListener("click", uploadSelectedImage);

requireLogin();

const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadDashboard() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "index.html";
    return;
  }

  const user = data.session.user;
  document.getElementById("userEmail").textContent = "Logged in as: " + user.email;
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

document.getElementById("logoutBtn").addEventListener("click", logoutUser);

loadDashboard();

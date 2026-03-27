const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "index.html";
  }
}

checkUser();

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

/* Upload counter */
let count = 0;

document.getElementById("uploadBtn").addEventListener("click", () => {
  if (count >= 1000) {
    alert("Limit reached. Watch ad to continue.");
    return;
  }

  count++;
  document.getElementById("uploadCount").textContent = count + " / 1000";
});

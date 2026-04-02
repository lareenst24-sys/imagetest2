const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";
const SUPABASE_URL = "YOUR_URL";
const SUPABASE_ANON_KEY = "YOUR_KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const claimBtn = document.getElementById("claimGiftCardBtn");

async function claimReward() {
  try {
    claimBtn.disabled = true;
    claimBtn.textContent = "Processing...";

    const { data } = await supabaseClient.auth.getSession();
    const token = data.session.access_token;

    const res = await fetch("http://localhost:3000/api/claim-reward", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.error);

    alert("Reward sent!");

  } catch (err) {
    alert(err.message);
  } finally {
    claimBtn.disabled = false;
    claimBtn.textContent = "Claim Reward";
  }
}

claimBtn.addEventListener("click", claimReward);

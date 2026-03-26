const SUPABASE_URL = "https://zyhiyorqjkvqdnubzynf.supabase.coL";
const SUPABASE_ANON_KEY = "sb_publishable_lxmie2q8CLR5C5W9OBhGhA_cMnMEfE0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

document.getElementById("showRegister").addEventListener("click", function (e) {
  e.preventDefault();
  loginForm.style.display = "none";
  registerForm.style.display = "flex";
});

document.getElementById("showLogin").addEventListener("click", function (e) {
  e.preventDefault();
  registerForm.style.display = "none";
  loginForm.style.display = "flex";
});

showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
});

function showMessage(message) {
  alert(message);
}

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name
      }
    }
  });

  if (error) {
    showMessage("Register error: " + error.message);
    return;
  }

  showMessage("Registered successfully. Check your email if confirmation is enabled.");
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("Login error: " + error.message);
    return;
  }

  showMessage("Login successful!");
  window.location.href = "dashboard.html";
});

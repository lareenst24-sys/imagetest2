const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginFormBox = document.getElementById("login-form");
const registerFormBox = document.getElementById("register-form");

const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

if (showRegister && loginFormBox && registerFormBox) {
  showRegister.addEventListener("click", function (e) {
    e.preventDefault();
    loginFormBox.style.display = "none";
    registerFormBox.style.display = "block";
  });
}

if (showLogin && loginFormBox && registerFormBox) {
  showLogin.addEventListener("click", function (e) {
    e.preventDefault();
    registerFormBox.style.display = "none";
    loginFormBox.style.display = "block";
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nameEl = document.getElementById("registerName");
    const emailEl = document.getElementById("registerEmail");
    const passwordEl = document.getElementById("registerPassword");

    const name = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value.trim() : "";

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) {
        alert("Register error: " + error.message);
        return;
      }

      alert("Registered successfully");
    } catch (err) {
      console.error("REGISTER FAILED:", err);
      alert("Register error: " + err.message);
    }
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");

    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value.trim() : "";

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert("Login error: " + error.message);
        return;
      }

      alert("Login successful");
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("LOGIN FAILED:", err);
      alert("Login error: " + err.message);
    }
  });
}

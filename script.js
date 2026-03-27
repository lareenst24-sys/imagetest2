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

async function checkSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session check error:", error);
      return;
    }

    if (data.session && window.location.pathname.includes("index")) {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    console.error("Session check failed:", err);
  }
}

checkSession();

function showWelcomePopup() {
  const alreadyShown = sessionStorage.getItem("welcomePopupShown");
  if (alreadyShown) return;

  sessionStorage.setItem("welcomePopupShown", "true");

  const popup = document.createElement("div");
  popup.className = "popup-overlay";
  popup.innerHTML = `
    <div class="popup-box">
      <button class="popup-close" id="closePopup">&times;</button>
      <h2>Welcome!</h2>
      <p>Your account was created successfully.</p>
      <video controls autoplay muted class="popup-video">
        <source src="welcome.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      <button class="popup-btn" id="popupOkBtn">Continue</button>
    </div>
  `;

  document.body.appendChild(popup);

  const closePopup = document.getElementById("closePopup");
  const popupOkBtn = document.getElementById("popupOkBtn");

  if (closePopup) {
    closePopup.addEventListener("click", function () {
      popup.remove();
      if (registerFormBox && loginFormBox) {
        registerFormBox.style.display = "none";
        loginFormBox.style.display = "block";
      }
    });
  }

  if (popupOkBtn) {
    popupOkBtn.addEventListener("click", function () {
      popup.remove();
      if (registerFormBox && loginFormBox) {
        registerFormBox.style.display = "none";
        loginFormBox.style.display = "block";
      }
    });
  }
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nameEl = document.getElementById("registerName");
    const emailEl = document.getElementById("registerEmail");
    const passwordEl = document.getElementById("registerPassword");
    const registerBtn = registerForm.querySelector("button[type='submit'], button");

    const name = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value.trim() : "";

    if (!email || !password) {
      alert("Please fill all required fields");
      return;
    }

    const originalBtnText = registerBtn ? registerBtn.textContent : "";

    try {
      if (registerBtn) {
        registerBtn.textContent = "Creating account...";
        registerBtn.disabled = true;
      }

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

      showWelcomePopup();
      registerForm.reset();
    } catch (err) {
      console.error("REGISTER FAILED:", err);
      alert("Register error: " + err.message);
    } finally {
      if (registerBtn) {
        registerBtn.textContent = originalBtnText;
        registerBtn.disabled = false;
      }
    }
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    const loginBtn = loginForm.querySelector("button[type='submit'], button");

    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value.trim() : "";

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    const originalBtnText = loginBtn ? loginBtn.textContent : "";

    try {
      if (loginBtn) {
        loginBtn.textContent = "Loading...";
        loginBtn.disabled = true;
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert("Login error: " + error.message);
        if (loginBtn) {
          loginBtn.textContent = originalBtnText;
          loginBtn.disabled = false;
        }
        return;
      }

      document.body.classList.add("fade-out");

      setTimeout(function () {
        window.location.href = "dashboard.html";
      }, 600);
    } catch (err) {
      console.error("LOGIN FAILED:", err);
      alert("Login error: " + err.message);

      if (loginBtn) {
        loginBtn.textContent = originalBtnText;
        loginBtn.disabled = false;
      }
    }
  });
}

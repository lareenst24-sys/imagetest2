const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginFormBox = document.getElementById("login-form");
const registerFormBox = document.getElementById("register-form");

const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function createMessageBox(formElement) {
  let box = formElement.querySelector(".message-box");

  if (!box) {
    box = document.createElement("div");
    box.className = "message-box";
    formElement.insertBefore(box, formElement.children[1]);
  }

  return box;
}

function showMessage(formElement, text, type = "success") {
  const box = createMessageBox(formElement);
  box.textContent = text;
  box.className = `message-box show ${type}`;
}

function clearMessage(formElement) {
  const box = formElement.querySelector(".message-box");
  if (box) {
    box.className = "message-box";
    box.textContent = "";
  }
}

function goToDashboard() {
  document.body.classList.add("fade-out");
  setTimeout(() => {
    window.location.href = "dashboard/";
  }, 600);
}

if (showRegister && loginFormBox && registerFormBox) {
  showRegister.addEventListener("click", function (e) {
    e.preventDefault();
    loginFormBox.style.display = "none";
    registerFormBox.style.display = "block";
    if (loginForm) clearMessage(loginForm);
  });
}

if (showLogin && loginFormBox && registerFormBox) {
  showLogin.addEventListener("click", function (e) {
    e.preventDefault();
    registerFormBox.style.display = "none";
    loginFormBox.style.display = "block";
    if (registerForm) clearMessage(registerForm);
  });
}

async function checkSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session check error:", error.message);
      return;
    }

    if (data.session) {
      const onAuthPage =
        window.location.pathname.endsWith("/") ||
        window.location.pathname.endsWith("index.html") ||
        window.location.pathname.includes("index");

      if (onAuthPage) {
        window.location.href = "dashboard";
      }
    }
  } catch (err) {
    console.error("Session check failed:", err);
  }
}

checkSession();

supabaseClient.auth.onAuthStateChange((event, session) => {
  const onAuthPage =
    window.location.pathname.endsWith("/") ||
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname.includes("index");

  if (session && onAuthPage) {
    window.location.href = "dashboard.html";
  }
});

if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage(registerForm);

    const nameEl = document.getElementById("registerName");
    const emailEl = document.getElementById("registerEmail");
    const passwordEl = document.getElementById("registerPassword");
    const registerBtn = registerForm.querySelector("button[type='submit'], button");

    const name = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value.trim() : "";

    if (!name || !email || !password) {
      showMessage(registerForm, "Please fill all fields.", "error");
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
        showMessage(registerForm, "Register error: " + error.message, "error");
        return;
      }

      if (data.session) {
        goToDashboard();
        return;
      }

      showMessage(
        registerForm,
        "Account created. Check your email if email confirmation is enabled, then log in.",
        "success"
      );

      registerForm.reset();

      setTimeout(() => {
        registerFormBox.style.display = "none";
        loginFormBox.style.display = "block";
      }, 1200);
    } catch (err) {
      console.error("REGISTER FAILED:", err);
      showMessage(registerForm, "Register error: " + err.message, "error");
    } finally {
      if (registerBtn) {
        registerBtn.textContent = originalBtnText;
        registerBtn.disabled = false;
      }
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage(loginForm);

    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    const rememberMeEl = document.getElementById("rememberMe");
    const loginBtn = loginForm.querySelector("button[type='submit'], button");

    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value.trim() : "";
    const rememberMe = rememberMeEl ? rememberMeEl.checked : true;

    if (!email || !password) {
      showMessage(loginForm, "Please enter email and password.", "error");
      return;
    }

    const originalBtnText = loginBtn ? loginBtn.textContent : "";

    try {
      if (loginBtn) {
        loginBtn.textContent = "Loading...";
        loginBtn.disabled = true;
      }

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        showMessage(loginForm, "Login error: " + error.message, "error");
        return;
      }

      if (!rememberMe) {
        sessionStorage.setItem("tempLogin", "true");
      } else {
        sessionStorage.removeItem("tempLogin");
      }

      goToDashboard();
    } catch (err) {
      console.error("LOGIN FAILED:", err);
      showMessage(loginForm, "Login error: " + err.message, "error");
    } finally {
      if (loginBtn) {
        loginBtn.textContent = originalBtnText;
        loginBtn.disabled = false;
      }
    }
  });
}

window.addEventListener("beforeunload", async () => {
  const tempLogin = sessionStorage.getItem("tempLogin");
  if (tempLogin === "true") {
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }
});

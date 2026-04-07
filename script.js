const SUPABASE_URL ="https://rgunoayzvtibhhzwlxtk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_x3m6IZ4h2aREkla8cI8oUA_m-Q1CSX6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* forms */
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginBox = document.getElementById("login-form");
const registerBox = document.getElementById("register-form");

const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

/* ui switch */
function openLogin() {
  if (loginBox) loginBox.style.display = "block";
  if (registerBox) registerBox.style.display = "none";
}

function openRegister() {
  if (loginBox) loginBox.style.display = "none";
  if (registerBox) registerBox.style.display = "block";
}

if (showRegister) {
  showRegister.addEventListener("click", (event) => {
    event.preventDefault();
    openRegister();
  });
}

if (showLogin) {
  showLogin.addEventListener("click", (event) => {
    event.preventDefault();
    openLogin();
  });
}

/* always redirect to the real dashboard file */
function goToDashboard() {
  window.location.href = "/dashboard/index.html";
}

/* keep user signed in */
async function checkSessionAndRedirect() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session?.user) {
    goToDashboard();
  }
}

/* login */
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;
    const rememberMe = document.getElementById("rememberMe")?.checked ?? true;

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      return;
    }

    if (!rememberMe) {
      console.warn("Remember me is off, but Supabase session persistence remains enabled by default.");
    }

    goToDashboard();
  });
}

/* register */
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("registerName")?.value.trim();
    const email = document.getElementById("registerEmail")?.value.trim();
    const password = document.getElementById("registerPassword")?.value;

    if (!name || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name: name,
          display_name: name
        }
      }
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created successfully. You can now log in.");
    openLogin();
  });
}

/* run on load */
openLogin();
checkSessionAndRedirect();

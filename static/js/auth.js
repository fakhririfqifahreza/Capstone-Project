class AuthManager {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;
    this.init();
  }

  init() {
    this.updateUI();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    // Register form
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
      registerForm.addEventListener("submit", (e) => this.handleRegister(e));
    }

    // Logout
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => this.handleLogout(e));
    }
  }

  handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    // Simple validation
    if (!email || !password) {
      showNotification("Please fill all fields", "error");
      return;
    }

    // Simulate API call
    setTimeout(() => {
      this.currentUser = {
        id: 1,
        name: "Julianda Zaki",
        email: email,
        phone: "08123456789",
      };

      localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
      this.updateUI();
      showNotification("Login successful!", "success");

      // Redirect to home
      window.location.href = "../index.html";
    }, 1000);
  }

  handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm-password");

    if (!name || !email || !password || !confirmPassword) {
      showNotification("Please fill all fields", "error");
      return;
    }

    if (password !== confirmPassword) {
      showNotification("Passwords do not match", "error");
      return;
    }

    // Simulate API call
    setTimeout(() => {
      showNotification("Registration successful! Please login.", "success");

      // Redirect to login
      window.location.href = "login.html";
    }, 1000);
  }

  handleLogout(e) {
    e.preventDefault();
    this.currentUser = null;
    localStorage.removeItem("currentUser");
    localStorage.removeItem("cart");
    this.updateUI();
    showNotification("Logged out successfully", "success");

    // Redirect to home
    window.location.href = "../index.html";
  }

  updateUI() {
    const guestElements = document.querySelectorAll(".guest-only");
    const userElements = document.querySelectorAll(".user-only");
    const userNameElements = document.querySelectorAll(".user-name");

    if (this.currentUser) {
      guestElements.forEach((el) => el.classList.add("hidden"));
      userElements.forEach((el) => el.classList.remove("hidden"));
      userNameElements.forEach((el) => {
        el.textContent = this.currentUser.name;
      });
    } else {
      guestElements.forEach((el) => el.classList.remove("hidden"));
      userElements.forEach((el) => el.classList.add("hidden"));
    }
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

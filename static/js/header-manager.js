class HeaderManager {
  constructor() {
    this.authManager = window.authManager;
    this.init();
  }

  init() {
    this.updateHeader();
    this.setupEventListeners();
  }

  updateHeader() {
    const guestElements = document.querySelectorAll(".guest-only");
    const userElements = document.querySelectorAll(".user-only");
    const userNameElements = document.querySelectorAll(".user-name");

    if (this.authManager && this.authManager.isLoggedIn()) {
      // User sudah login
      guestElements.forEach((el) => (el.style.display = "none"));
      userElements.forEach((el) => (el.style.display = "block"));

      const user = this.authManager.getCurrentUser();
      if (user) {
        userNameElements.forEach((el) => {
          el.textContent = user.name;
        });
      }
    } else {
      // User belum login
      guestElements.forEach((el) => (el.style.display = "block"));
      userElements.forEach((el) => (el.style.display = "none"));
    }
  }

  setupEventListeners() {
    // Logout functionality
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.authManager) {
          this.authManager.handleLogout(e);
        }
      });
    }
  }
}

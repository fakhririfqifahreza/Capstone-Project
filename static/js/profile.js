// Minimal JS to power profile page tabs and small UI helpers

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `position: fixed; top: 100px; right: 20px; background: ${
    type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"
  }; color: white; padding: 1rem 2rem; border-radius: 4px; z-index: 10000; animation: slideIn 0.3s ease;`;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      if (notification.parentNode)
        notification.parentNode.removeChild(notification);
    }, 300);
  }, 2500);
}

function setupTabs() {
  const tabLinks = document.querySelectorAll(
    ".profile-nav .nav-item[data-tab]"
  );
  const tabs = document.querySelectorAll(".profile-tab");

  tabLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = link.getAttribute("data-tab") + "-tab";

      tabLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      tabs.forEach((tab) => tab.classList.remove("active"));
      const el = document.getElementById(tabId);
      if (el) el.classList.add("active");
    });
  });
}

function setupPasswordStrength() {
  const passwordInput = document.getElementById("new-password");
  const strengthFill = document.getElementById("password-strength-fill");
  const strengthLabel = document.getElementById("password-strength-label");

  if (passwordInput && strengthFill && strengthLabel) {
    passwordInput.addEventListener("input", function () {
      const password = this.value;
      let strength = 0;
      let label = "Password strength";
      let color = "#f44336";

      if (password.length >= 8) strength += 25;
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25;
      if (password.match(/\d/)) strength += 25;
      if (password.match(/[^a-zA-Z\d]/)) strength += 25;

      if (strength >= 75) {
        label = "Strong password";
        color = "#4CAF50";
      } else if (strength >= 50) {
        label = "Good password";
        color = "#FF9800";
      } else if (strength >= 25) {
        label = "Weak password";
        color = "#f44336";
      } else {
        label = "Very weak password";
        color = "#f44336";
      }

      strengthFill.style.width = strength + "%";
      strengthFill.style.background = color;
      strengthLabel.textContent = label;
      strengthLabel.style.color = color;
    });
  }
}

function resetForm() {
  const form = document.getElementById("profile-form");
  if (form) {
    form.reset();
    showNotification("Form has been reset", "info");
  }
}

// Toggle password visibility helper.
// If a global togglePassword exists (from other shared scripts), prefer that.
function togglePassword(inputId) {
  // avoid infinite recursion if this file's function delegates to itself
  if (window._profileTogglePasswordDelegated) {
    // already delegated, perform local toggle
  } else if (
    typeof window.togglePassword === "function" &&
    window.togglePassword !== togglePassword
  ) {
    // mark delegation to avoid recursion and call the globally available one
    try {
      window._profileTogglePasswordDelegated = true;
      window.togglePassword(inputId);
      return;
    } finally {
      window._profileTogglePasswordDelegated = false;
    }
  }

  const input = document.getElementById(inputId);
  if (!input) return;

  // Toggle the input type
  input.type = input.type === "password" ? "text" : "password";

  // Try to toggle a nearby icon/text if present. Many templates use a button sibling with an eye emoji.
  try {
    const parent = input.parentNode;
    if (parent) {
      // look for an element with class 'password-toggle' first
      let toggleEl = parent.querySelector(".password-toggle");
      if (!toggleEl) {
        // fallback: any button in the same parent
        toggleEl = parent.querySelector("button");
      }
      if (toggleEl) {
        const txt = (toggleEl.textContent || "").trim();
        if (txt === "👁️") toggleEl.textContent = "👁️‍🗨️";
        else if (txt === "👁️‍🗨️") toggleEl.textContent = "👁️";
      }
    }
  } catch (e) {
    // silent
  }
}

function enable2FA() {
  showNotification("Two-factor authentication feature coming soon!", "info");
}

// Avatar preview helper: shows selected image inside #user-avatar
function setupAvatarPreview() {
  const fileInput = document.getElementById("profile-avatar");
  const avatarContainer = document.getElementById("user-avatar");

  if (!fileInput || !avatarContainer) return;

  fileInput.addEventListener("change", function (e) {
    const file = this.files && this.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showNotification && showNotification("Tipe file tidak didukung", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        // replace avatar placeholder with an img element
        avatarContainer.innerHTML = "";
        const img = document.createElement("img");
        img.src = ev.target.result;
        img.alt = "Avatar preview";
        img.style.width = "88px";
        img.style.height = "88px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "50%";
        avatarContainer.appendChild(img);
      } catch (err) {
        console.error("Error rendering avatar preview", err);
      }
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupPasswordStrength();

  // Profile form submission: basic UX - server handles update
  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(profileForm);
      try {
        showNotification("Menyimpan perubahan...", "info");
        const resp = await fetch(profileForm.action, {
          method: "POST",
          body: formData,
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        const data = await resp.json();
        if (data.success) {
          // use SweetAlert2 if available
          if (window.Swal) {
            Swal.fire(
              "Berhasil",
              data.message || "Profil diperbarui",
              "success"
            );
          } else {
            showNotification(data.message || "Profil diperbarui", "success");
          }
          // optionally refresh page to reflect avatar update
          setTimeout(() => location.reload(), 900);
        } else {
          if (window.Swal)
            Swal.fire(
              "Gagal",
              data.message || "Gagal memperbarui profil",
              "error"
            );
          else
            showNotification(
              data.message || "Gagal memperbarui profil",
              "error"
            );
        }
      } catch (err) {
        console.error(err);
        if (window.Swal)
          Swal.fire("Error", "Terjadi kesalahan jaringan", "error");
        else showNotification("Terjadi kesalahan jaringan", "error");
      }
    });
  }

  // Password change form via AJAX
  const passwordForm = document.getElementById("password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const current = document.getElementById("current-password").value;
      const next = document.getElementById("new-password").value;
      const confirm = document.getElementById("confirm-password").value;
      if (!current || !next || !confirm) {
        if (window.Swal) Swal.fire("Error", "Semua field harus diisi", "error");
        else showNotification("Semua field harus diisi", "error");
        return;
      }
      if (next !== confirm) {
        if (window.Swal)
          Swal.fire("Error", "Password baru tidak cocok", "error");
        else showNotification("Password baru tidak cocok", "error");
        return;
      }
      try {
        const resp = await fetch("/change_password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({
            current_password: current,
            new_password: next,
          }),
        });
        const data = await resp.json();
        if (data.success) {
          if (window.Swal)
            Swal.fire(
              "Berhasil",
              data.message || "Password diperbarui",
              "success"
            );
          else
            showNotification(data.message || "Password diperbarui", "success");
          passwordForm.reset();
        } else {
          if (window.Swal)
            Swal.fire(
              "Gagal",
              data.message || "Gagal memperbarui password",
              "error"
            );
          else
            showNotification(
              data.message || "Gagal memperbarui password",
              "error"
            );
        }
      } catch (err) {
        console.error(err);
        if (window.Swal)
          Swal.fire("Error", "Terjadi kesalahan jaringan", "error");
        else showNotification("Terjadi kesalahan jaringan", "error");
      }
    });
  }
});

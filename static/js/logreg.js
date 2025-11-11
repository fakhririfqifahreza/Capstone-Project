// ===== GLOBAL ALERT =====
function showAlert(type, message, redirect = null) {
  let iconColor, titleText;
  switch (type) {
    case "success":
      iconColor = "#34a853";
      titleText = "";
      break; // No title for success
    case "error":
      iconColor = "#ea4335";
      titleText = "";
      break; // No title for error
    case "warning":
      iconColor = "#fbbc05";
      titleText = "";
      break; // No title for warning
    default:
      iconColor = "#4285f4";
      titleText = ""; // No title for info
  }

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: type === "success" ? 2000 : 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
    willClose: () => {
      if (redirect) setTimeout(() => (window.location.href = redirect), 100);
    },
  });

  Toast.fire({
    icon: type,
    title: message,
    background: "rgba(255,255,255,0.98)",
    padding: "0.7rem 1rem",
    customClass: {
      popup: "animate_animated animate_fadeInDown",
      title: "text-sm font-normal",
    },
  });
}

// ===== MAIN =====
$(document).ready(function () {
  const container = document.getElementById("authContainer");
  if (!container) return console.error("authContainer tidak ditemukan!");

  // Mode awal dari URL
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  if (mode === "register") container.classList.add("right-panel-active");
  else container.classList.remove("right-panel-active");

  // Tombol switch Login/Register
  $("#signUp")
    .off("click")
    .on("click", () => container.classList.add("right-panel-active"));
  $("#signIn")
    .off("click")
    .on("click", () => container.classList.remove("right-panel-active"));

  // ===== LOGIN =====
  $("#login-form").on("submit", function (e) {
    e.preventDefault();
    const email = $("#email").val().trim();
    const password = $("#password").val().trim();

    if (!email || !password)
      return showAlert("warning", "Email dan password harus diisi.");

    $.ajax({
      url: "/login",
      method: "POST",
      data: { email, password },
      success: function (res) {
        if (res.success) {
          // Mark client as logged in so navbar updates immediately if needed
          try {
            sessionStorage.setItem("logged_in", "true");
          } catch (e) {}
          // Prefer next param in URL (so guests return to where they were),
          // otherwise use server-provided redirect_url, fallback to homepage
          const urlParams = new URLSearchParams(window.location.search);
          const next = urlParams.get("next");
          const redirectTo = next || res.redirect_url || "/";
          showAlert("success", res.message, redirectTo);
        } else showAlert("error", res.message);
      },
      error: () => showAlert("error", "Terjadi kesalahan server."),
    });
  });

  // ===== REGISTER =====
  $("#register-form").on("submit", function (e) {
    e.preventDefault();
    const name = $("#name").val().trim();
    const email = $("#emailRegister").val().trim();
    const password = $("#passwordRegister").val().trim();
    const confirmPassword = $("#confirm_password").val().trim();
    const role = $("#role").val();

    if (!name || !email || !password || !confirmPassword)
      return showAlert("warning", "Semua field harus diisi!");

    if (password !== confirmPassword)
      return showAlert("error", "Password tidak cocok!");

    $.ajax({
      url: "/register",
      method: "POST",
      data: { name, email, password, confirm_password: confirmPassword, role },
      success: function (res) {
        if (res.success) {
          showAlert("success", res.message);
          container.classList.remove("right-panel-active");
          $("#login-form")[0].reset();
          $("#register-form")[0].reset();
        } else showAlert("error", res.message);
      },
      error: () => showAlert("error", "Terjadi kesalahan server."),
    });
  });
});

// Password toggle functionality
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const toggle = input.parentNode.querySelector(".password-toggle");

  if (input.type === "password") {
    input.type = "text";
    toggle.textContent = "👁️‍🗨️";
  } else {
    input.type = "password";
    toggle.textContent = "👁️";
  }
}

// Modern rating functionality
function setupModernRating() {
  const stars = document.querySelectorAll(".modern-star");
  const ratingDisplay = document.getElementById("rating-display");
  const ratingValue = document.getElementById("rating-value");

  stars.forEach((star) => {
    star.addEventListener("click", function () {
      const rating = parseInt(this.getAttribute("data-rating"));
      setModernRating(rating);
    });

    star.addEventListener("mouseenter", function () {
      const rating = parseInt(this.getAttribute("data-rating"));
      highlightStars(rating);
    });
  });

  // Reset stars when mouse leaves rating area
  const ratingContainer = document.querySelector(".modern-rating");
  if (ratingContainer) {
    ratingContainer.addEventListener("mouseleave", function () {
      const currentRating = parseInt(ratingValue?.value || "0");
      highlightStars(currentRating);
    });
  }
}

function setModernRating(rating) {
  const stars = document.querySelectorAll(".modern-star");
  const ratingDisplay = document.getElementById("rating-display");
  const ratingValue = document.getElementById("rating-value");

  stars.forEach((star) => {
    const starRating = parseInt(star.getAttribute("data-rating"));
    if (starRating <= rating) {
      star.classList.add("active");
    } else {
      star.classList.remove("active");
    }
  });

  if (ratingDisplay) ratingDisplay.textContent = rating;
  if (ratingValue) ratingValue.value = rating;
}

function highlightStars(rating) {
  const stars = document.querySelectorAll(".modern-star");

  stars.forEach((star) => {
    const starRating = parseInt(star.getAttribute("data-rating"));
    if (starRating <= rating) {
      star.style.color = "var(--secondary)";
    } else {
      star.style.color = "var(--light)";
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  setupModernRating();

  // Add floating label functionality
  const floatingInputs = document.querySelectorAll(
    ".floating-label .modern-input"
  );
  floatingInputs.forEach((input) => {
    input.addEventListener("focus", function () {
      this.parentNode.classList.add("focused");
    });

    input.addEventListener("blur", function () {
      if (!this.value) {
        this.parentNode.classList.remove("focused");
      }
    });

    // Check initial state
    if (input.value) {
      input.parentNode.classList.add("focused");
    }
  });
});

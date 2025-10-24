// $(document).ready(function () {
//   const $productLink = $("a.nav-link[href='product.html']");

//   // Buat elemen kotak pesan modern
//   const $messageBox = $("<div></div>")
//     .css({
//       position: "fixed",
//       bottom: "20px",
//       left: "50%",
//       transform: "translateX(-50%)",
//       backgroundColor: "#f44336",
//       color: "white",
//       padding: "15px",
//       borderRadius: "8px",
//       fontSize: "16px",
//       fontFamily: "Arial, sans-serif",
//       display: "none",
//       zIndex: "9999",
//     })
//     .text(
//       "Untuk mengakses produk kami, silakan login terlebih dahulu. Jika Anda belum memiliki akun, mohon untuk mendaftar terlebih dahulu"
//     );

//   // Tambahkan kotak pesan ke body
//   $("body").append($messageBox);

//   // Tambahkan event listener untuk klik pada nav-link "Product"
//   $productLink.on("click", function (event) {
//     event.preventDefault();

//     $messageBox.fadeIn();

//     setTimeout(function () {
//       $messageBox.fadeOut();
//     }, 7000);
//   });
// });

// Menambahkan event listener untuk scroll event
window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar");
  // Menambahkan class scrolled ketika scroll lebih dari 50px
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// Menambahkan animasi klik pada navbar link
const navLinks = document.querySelectorAll(".nav-link");
navLinks.forEach((link) => {
  link.addEventListener("click", function () {
    navLinks.forEach((link) => link.classList.remove("active"));
    this.classList.add("active");
  });
});

// Smooth scroll untuk anchor links
const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
smoothScrollLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    window.scrollTo({
      top: target.offsetTop - 60,
      behavior: "smooth",
    });
  });
});

// // Menambahkan efek hover animasi pada navbar-brand
// const navbarBrand = document.querySelector(".navbar-brand");
// navbarBrand.addEventListener("mouseenter", () => {
//   navbarBrand.style.transform = "scale(1.1)";
//   navbarBrand.style.transition = "transform 0.3s ease";
// });

// navbarBrand.addEventListener("mouseleave", () => {
//   navbarBrand.style.transform = "scale(1)";
// });

// Navbar-toggler animasi (hamburger menu)
const navbarToggler = document.querySelector(".navbar-toggler");
navbarToggler.addEventListener("click", () => {
  navbarToggler.classList.toggle("toggle-active");

  if (navbarToggler.classList.contains("toggle-active")) {
    navbarToggler.style.transform = "rotate(90deg)";
  } else {
    navbarToggler.style.transform = "rotate(0deg)";
  }
});

// Menambahkan background navbar berubah saat scroll
const navbarOnScroll = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 0) {
    navbarOnScroll.style.backgroundColor = "#3a2c1e";
  } else {
    navbarOnScroll.style.backgroundColor = "#4b3c1b";
  }
});

// Menambahkan efek hover dinamis pada nav-login dan nav-register
const navLogin = document.querySelector(".nav-login");
const navRegister = document.querySelector(".nav-register");

navLogin.addEventListener("mouseenter", () => {
  navLogin.style.transform = "scale(1.1)";
  navLogin.style.transition = "transform 0.3s ease";
});
navLogin.addEventListener("mouseleave", () => {
  navLogin.style.transform = "scale(1)";
});

navRegister.addEventListener("mouseenter", () => {
  navRegister.style.transform = "scale(1.1)";
  navRegister.style.transition = "transform 0.3s ease";
});
navRegister.addEventListener("mouseleave", () => {
  navRegister.style.transform = "scale(1)";
});

// Menambahkan efek smooth collapse pada navbar
const navbarCollapse = document.querySelector(".collapse");
const collapseTransition = new bootstrap.Collapse(navbarCollapse, {
  toggle: false,
});

navbarToggler.addEventListener("click", () => {
  if (navbarCollapse.classList.contains("show")) {
    collapseTransition.hide();
  } else {
    collapseTransition.show();
  }
});

// Mengubah tampilan navbar berdasarkan status login
if (sessionStorage.getItem('logged_in') === 'true') {
  // Jika user sudah login, ganti navbar
  document.querySelector('.nav-login').innerHTML = 'Logout';
  document.querySelector('.nav-login').setAttribute('href', '/logout');
  document.querySelector('.nav-register').style.display = 'none';
} else {
  // Jika user belum login, tampilkan Login dan Register
  document.querySelector('.nav-login').innerHTML = 'Login';
  document.querySelector('.nav-login').setAttribute('href', '/login');
  document.querySelector('.nav-register').style.display = 'block';
}

// product

$(document).ready(function () {
  // Ambil tombol "Lihat Selengkapnya"
  const $moreButton = $(".more");

  // Buat elemen kotak pesan modern
  const $messageBox = $("<div></div>")
    .css({
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#f44336",
      color: "white",
      padding: "15px",
      borderRadius: "8px",
      fontSize: "16px",
      fontFamily: "Arial, sans-serif",
      display: "none",
    })
    .text(
      "Untuk melihat produk lebih lengkap, Anda perlu melakukan login terlebih dahulu. Jika Anda belum memiliki akun, silakan daftar/register terlebih dahulu"
    );

  // Tambahkan kotak pesan ke body
  $("body").append($messageBox);

  // Tambahkan event listener untuk tombol "Lihat Selengkapnya"
  // $moreButton.on("click", function () {
  //   $messageBox.fadeIn();

  // Setelah 9 detik, sembunyikan pesan
  //   setTimeout(function () {
  //     $messageBox.fadeOut();
  //   }, 5000);
  // });
});

// Modal pesan

$(document).ready(function () {
  // Fungsi untuk tombol "Beli"
  $(".btn-primary").on("click", function () {
    $("<div>")
      .css({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff",
        color: "#333",
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)",
        zIndex: 1055,
        maxWidth: "400px",
        width: "100%",
        opacity: 0,
        fontSize: "20px",
        animation: "fadeIn 0.5s ease-out forwards",
      })
      .html(
        `<h4 class="text-center">Oops!</h4>
         <p class="text-center">Maaf, untuk membeli produk ini, melihat harga, ukuran, dan detail lainnya, Anda harus login atau mendaftar terlebih dahulu.</p>
         <div class="d-flex justify-content-center">
           <button id="alertClose" class="btn btn-warning">Tutup</button>
         </div>`
      )
      .attr("id", "customAlert")
      .appendTo("body")
      .animate({ opacity: 1 }, 500);

    // Fungsi untuk menutup alert dengan animasi
    $("#alertClose").on("click", function () {
      $("#customAlert").animate({ opacity: 0 }, 300, function () {
        $(this).remove();
      });
    });
  });
});

// review
$(document).ready(function () {
  // Ambil elemen tombol Submit Review dan input form
  const $submitButton = $("#submitReview");
  const $reviewName = $("#reviewName");
  const $reviewMessage = $("#reviewMessage");

  // Buat elemen kotak pesan modern
  const $messageBox = $("<div></div>").css({
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "white",
    padding: "15px",
    borderRadius: "8px",
    fontSize: "16px",
    fontFamily: "Arial, sans-serif",
    display: "none",
    zIndex: "9999",
  }).appendTo("body");

  // Fungsi untuk menampilkan pesan
  function showMessage(message, isError = false, duration = 4000) {
    $messageBox
      .text(message)
      .css("backgroundColor", isError ? "#f44336" : "#4CAF50") // Merah untuk error, hijau untuk sukses
      .fadeIn(300)
      .delay(duration)
      .fadeOut(300);
  }

  // Event listener pada tombol submit
  $submitButton.on("click", function (event) {
    event.preventDefault(); // Mencegah form submit secara default

    // Ambil nilai input
    const name = $reviewName.val().trim();
    const review = $reviewMessage.val().trim();

    // Validasi input
    if (!name) {
      showMessage("Anda lupa memasukkan nama!", true);
      return;
    }

    if (!review) {
      showMessage("Anda lupa memasukkan review!", true);
      return;
    }

    if (review.length < 10 || !/\S/.test(review)) {
      showMessage(
        "Ulasan Anda terlalu singkat atau kurang relevan. Mohon tuliskan ulasan yang lebih jelas dan informatif.",
        true,
        6000
      );
      return;
    }

    // Kirim data ke server menggunakan AJAX
    $.ajax({
      url: "/submit_review",
      method: "POST",
      data: {
        name: name,
        review: review,
      },
      success: function () {
        showMessage(
          "Terima kasih atas ulasan Anda. Kami akan mempertimbangkan masukan Anda dengan baik."
        );
        $reviewName.val(""); // Kosongkan field input
        $reviewMessage.val("");
      },
      error: function () {
        showMessage("Terjadi kesalahan saat mengirim review.", true);
      },
    });
  });
});

const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === "true") {
            Swal.fire({
                icon: 'success',
                title: 'Terima kasih!',
                text: 'Terima kasih atas ulasan Anda. Kami akan mempertimbangkan masukan Anda dengan baik.',
                confirmButtonText: 'OK'
            });
        }

document.addEventListener('DOMContentLoaded', function () {
  const revealElements = document.querySelectorAll('.reveal');

  // Fungsi untuk memeriksa apakah elemen ada di dalam viewport
  function checkVisibility() {
    revealElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom >= 0) {
        el.classList.add('visible');
      }
    });
  }

  // Memeriksa pada saat halaman pertama dimuat
  checkVisibility();

  // Menambahkan event listener untuk scroll
  window.addEventListener('scroll', checkVisibility);
});

document.addEventListener("DOMContentLoaded", function () {
  const productLink = document.querySelector(".nav-link[href='{{ url_for('product') }}']");
  if (productLink) {
    productLink.addEventListener("click", function (e) {
      e.preventDefault(); // Mencegah navigasi langsung
      Swal.fire({
        title: "Akses Terbatas!",
        text: "Anda harus login terlebih dahulu untuk melihat produk.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Login",
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "{{ url_for('login') }}"; // Arahkan ke halaman login
        }
      });
    });
  }
 });

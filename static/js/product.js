// 1.JS For Modal

$(document).ready(function () {
  // Pilih semua tombol "Lihat Detail"
  $(".button-product").on("click", function () {
    // Ambil data dari atribut tombol
    const title = $(this).data("title");
    const description = $(this).data("description");
    const image = $(this).data("image");

    // Isi data ke dalam elemen modal
    $("#modalTitle").text(title);
    $("#modalDescription").text(description);
    $("#modalImage").attr("src", image);
  });
});

// 2.

// Pilih semua tombol "Lihat Detail"
const detailButtons = document.querySelectorAll(".button-product");

// Daftar harga acak antara 300.000 hingga 500.000
const prices = [
  "Rp. 250.000",
  "Rp. 300.000,",
  "Rp. 315.000",
  "Rp. 330.000",
  "Rp. 400.000",
];

// Tambahkan event listener untuk setiap tombol
detailButtons.forEach((button) => {
  button.addEventListener("click", function () {
    // Ambil data dari atribut tombol
    const title = this.getAttribute("data-title");
    const description = this.getAttribute("data-description");
    const image = this.getAttribute("data-image");

    // Ambil harga acak dari daftar harga
    const price = prices[Math.floor(Math.random() * prices.length)];

    // Isi data ke dalam elemen modal
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalDescription").textContent = description;
    document.getElementById("modalImage").src = image;
    document.getElementById("modalPrice").textContent = price;

    // Reset pilihan ukuran
    document.getElementById("productSize").value = "M";
  });
});

$(document).ready(function () {
  $(".button-product").on("click", function () {
    const product = {
      id: $(this).data("id"),
      title: $(this).data("title"),
      description: $(this).data("description"),
      image_url: $(this).data("image"),
      price: $(this).data("price"),
    };

    $("#modalTitle").text(product.title);
    $("#modalDescription").text(product.description);
    $("#modalImage").attr("src", product.image_url);

    $("#buyButton")
      .off("click")
      .on("click", function () {
        $.ajax({
          url: "/add_to_cart",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify(product),
          success: function () {
            window.location.href = "/list";
          },
        });
      });
  });
});

$(document).ready(function () {
  $("#productFilter").on("change", function () {
    const filterType = $(this).val();

    // Kirim permintaan filter ke backend
    $.ajax({
      url: "/filter_products",
      type: "GET",
      data: { filter: filterType },
      success: function (products) {
        // Kosongkan kontainer produk
        const productContainer = $(".row.mt-5.g-4.justify-content-center");
        productContainer.empty();

        // Tambahkan produk yang difilter
        products.forEach((product) => {
          const productCard = `
            <div class="col-sm-6 col-md-4">
              <div class="card-product">
                <div class="card-image">
                  <img src="${product.image_url}" alt="${product.title}" class="img-fluid" />
                </div>
                <div class="card-body d-flex flex-column justify-content-between">
                  <h5 class="card-title">${product.title}</h5>
                  <p class="card-text">Harga: Rp ${product.price}</p>
                  <button class="button-product mt-3" data-bs-toggle="modal" data-bs-target="#productModal"
                    data-id="${product.id}" data-title="${product.title}"
                    data-description="${product.description}" data-image="${product.image_url}"
                    data-price="${product.price}">
                    Lihat Detail
                  </button>
                </div>
              </div>
            </div>
          `;
          productContainer.append(productCard);
        });
      },
      error: function () {
        alert("Gagal memuat data produk. Silakan coba lagi.");
      },
    });
  });
});

// Search functionality (debounced)
(function () {
  const searchInput = document.getElementById("productSearch");
  const productContainer = document.querySelector(
    ".row.mt-5.g-4.justify-content-center"
  );
  let debounceTimer = null;

  function renderProducts(products, query) {
    productContainer.innerHTML = "";
    products.forEach((product) => {
      // highlight query in title
      const title = product.title;
      let titleHtml = title;
      if (query) {
        const re = new RegExp(`(${escapeRegExp(query)})`, "ig");
        titleHtml = title.replace(re, "<mark>$1</mark>");
      }
      const productCard = `
            <div class="col-sm-6 col-md-4">
              <div class="card-product">
                <div class="card-image">
                  <img src="${product.image_url}" alt="${escapeHtml(
        product.title
      )}" class="img-fluid" />
                </div>
                <div class="card-body d-flex flex-column justify-content-between">
                  <h5 class="card-title">${titleHtml}</h5>
                  <p class="card-text">Harga: Rp ${product.price}</p>
                  <button class="button-product mt-3" data-bs-toggle="modal" data-bs-target="#productModal"
                    data-id="${
                      product.id || product._id
                    }" data-title="${escapeHtml(product.title)}"
                    data-description="${escapeHtml(
                      product.description || ""
                    )}" data-image="${product.image_url}"
                    data-price="${product.price}">
                    Lihat Detail
                  </button>
                </div>
              </div>
            </div>
          `;
      productContainer.insertAdjacentHTML("beforeend", productCard);
    });
    // Rebind modal buttons for newly created items
    document.querySelectorAll(".button-product").forEach((btn) => {
      btn.addEventListener("click", function () {
        const product = {
          id: this.getAttribute("data-id"),
          title: this.getAttribute("data-title"),
          description: this.getAttribute("data-description"),
          image_url: this.getAttribute("data-image"),
          price: this.getAttribute("data-price"),
        };
        $("#modalTitle").text(product.title);
        $("#modalDescription").text(product.description);
        $("#modalImage").attr("src", product.image_url);

        $("#buyButton")
          .off("click")
          .on("click", function () {
            $.ajax({
              url: "/add_to_cart",
              type: "POST",
              contentType: "application/json",
              data: JSON.stringify(product),
              success: function () {
                window.location.href = "/list";
              },
            });
          });
      });
    });
  }

  function escapeHtml(text) {
    return (text + "").replace(/[&<>\"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const q = e.target.value.trim();
      clearTimeout(debounceTimer);
      // client-side quick filter if there are existing cards
      debounceTimer = setTimeout(() => {
        if (!q) {
          // reload all products (call filter type 'all')
          $("#productFilter").val("all").trigger("change");
          return;
        }
        // use server-side search for better results
        $.ajax({
          url: "/search_products",
          type: "GET",
          data: { q },
          success: function (products) {
            renderProducts(products, q);
          },
          error: function () {
            console.warn("Search failed");
          },
        });
      }, 300);
    });
  }
})();

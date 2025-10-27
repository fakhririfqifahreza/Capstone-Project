// product.js - simplified and bug-fixed
// Key fixes:
// - normalizePriceToInt is available to all handlers
// - use attr('data-id') to preserve raw string ids
// - single delegated click handler for .button-product
// - ensures AJAX sends JSON (contentType: application/json)

function normalizePriceToInt(price) {
  if (price == null) return 0;
  let s = String(price)
    .replace(/[^0-9.,-]/g, "")
    .trim();
  if (s.indexOf(".") > -1 && s.indexOf(",") > -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.indexOf(".") > -1 && s.indexOf(",") === -1) {
    s = s.replace(/\./g, "");
  } else if (s.indexOf(",") > -1 && s.indexOf(".") === -1) {
    s = s.replace(/,/g, ".");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return Math.round(n);
}

// Delegated handler: works for static and dynamically inserted .button-product
$(document).on("click", ".button-product", function (e) {
  const $btn = $(this);
  const product = {
    id: $btn.attr("data-id"),
    title: $btn.attr("data-title") || $btn.data("title"),
    description: $btn.attr("data-description") || $btn.data("description"),
    image_url: $btn.attr("data-image") || $btn.data("image"),
    price: $btn.attr("data-price") || $btn.data("price"),
  };

  // populate modal
  $("#modalTitle").text(product.title);
  $("#modalDescription").text(product.description);
  $("#modalImage").attr("src", product.image_url || "");

  // bind buy button
  $("#buyButton")
    .off("click")
    .on("click", function () {
      const payload = Object.assign({}, product, {
        price: normalizePriceToInt(product.price),
        quantity: 1,
      });

      $.ajax({
        url: "/add_to_cart",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),
        success: function (resp) {
          // Hide modal (Bootstrap 5)
          try {
            var modalEl = document.getElementById("productModal");
            var instance = bootstrap.Modal.getInstance(modalEl);
            if (instance) instance.hide();
            else new bootstrap.Modal(modalEl).hide();
          } catch (e) {
            // fallback: jQuery hide
            $("#productModal").modal("hide");
          }

          // Show SweetAlert2 toast (non-blocking)
          if (typeof Swal !== "undefined") {
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "Produk berhasil ditambahkan ke keranjang",
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
            });
          } else {
            alert("Produk berhasil ditambahkan ke keranjang");
          }

          // If a cart count badge exists, increment it (graceful)
          var $badge = $("#cartCount");
          if ($badge.length) {
            var n = parseInt($badge.text() || "0") || 0;
            $badge.text(n + 1);
          }
        },
        error: function (xhr) {
          console.error("add_to_cart failed", xhr);
          alert(
            "Gagal memasukkan produk ke keranjang. Periksa console server untuk detil."
          );
        },
      });
    });
});

// Filter handler (kept mostly as-is)
$(document).ready(function () {
  $("#productFilter").on("change", function () {
    const filterType = $(this).val();
    $.ajax({
      url: "/filter_products",
      type: "GET",
      data: { filter: filterType },
      success: function (products) {
        const productContainer = $(".row.mt-5.g-4.justify-content-center");
        productContainer.empty();
        products.forEach(function (product) {
          const id = product.id || product._id || "";
          const productCard = `
            <div class="col-sm-6 col-md-4">
              <div class="card-product">
                <div class="card-image">
                  <img src="${product.image_url}" alt="${
            product.title
          }" class="img-fluid" />
                </div>
                <div class="card-body d-flex flex-column justify-content-between">
                  <h5 class="card-title">${product.title}</h5>
                  <p class="card-text">Harga: Rp ${product.price}</p>
                  <button class="button-product mt-3" data-bs-toggle="modal" data-bs-target="#productModal"
                    data-id="${id}" data-title="${escapeHtml(product.title)}"
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
          productContainer.append(productCard);
        });
      },
      error: function () {
        alert("Gagal memuat data produk. Silakan coba lagi.");
      },
    });
  });

  // Search (debounced)
  (function () {
    const searchInput = document.getElementById("productSearch");
    const productContainer = document.querySelector(
      ".row.mt-5.g-4.justify-content-center"
    );
    let debounceTimer = null;
    if (!searchInput) return;
    searchInput.addEventListener("input", function (e) {
      const q = e.target.value.trim();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        if (!q) {
          $("#productFilter").val("all").trigger("change");
          return;
        }
        $.ajax({
          url: "/search_products",
          type: "GET",
          data: { q },
          success: function (products) {
            // reuse filter rendering
            $(".row.mt-5.g-4.justify-content-center").empty();
            products.forEach(function (product) {
              const id = product.id || product._id || "";
              const card = `
                <div class="col-sm-6 col-md-4">
                  <div class="card-product">
                    <div class="card-image">
                      <img src="${product.image_url}" alt="${escapeHtml(
                product.title
              )}" class="img-fluid" />
                    </div>
                    <div class="card-body d-flex flex-column justify-content-between">
                      <h5 class="card-title">${escapeHtml(product.title)}</h5>
                      <p class="card-text">Harga: Rp ${product.price}</p>
                      <button class="button-product mt-3" data-bs-toggle="modal" data-bs-target="#productModal"
                        data-id="${id}" data-title="${escapeHtml(
                product.title
              )}"
                        data-description="${escapeHtml(
                          product.description || ""
                        )}" data-image="${product.image_url}"
                        data-price="${product.price}">Lihat Detail</button>
                    </div>
                  </div>
                </div>
              `;
              productContainer.insertAdjacentHTML("beforeend", card);
            });
          },
          error: function () {
            console.warn("Search failed");
          },
        });
      }, 300);
    });
  })();
});

function escapeHtml(text) {
  return (text + "").replace(/[&<>\\"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

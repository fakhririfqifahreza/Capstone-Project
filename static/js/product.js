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

// Format number to Rupiah with thousands separator
function formatRupiah(num) {
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Delegated handler: works for card clicks (.card-product.clickable) and existing .button-product
$(document).on(
  "click",
  ".button-product, .card-product.clickable",
  function (e) {
    var $source = $(this);
    // find the nearest card-product container (works when clicking the card or its inner button)
    var $el = $source.closest(".card-product");
    const product = {
      id: $el.attr("data-id") || $el.data("id"),
      title: $el.attr("data-title") || $el.data("title"),
      description: $el.attr("data-description") || $el.data("description"),
      image_url: $el.attr("data-image") || $el.data("image"),
      price: $el.attr("data-price") || $el.data("price"),
    };

    // populate modal
    $("#modalTitle").text(product.title);
    $("#modalDescription").text(product.description);
    $("#modalImage").attr("src", product.image_url || "");
    // price with Rupiah formatting
    const priceInt = normalizePriceToInt(product.price);
    $("#modalPrice").text(formatRupiah(priceInt));
    // store raw price in data attribute for calculation
    $("#modalPrice").attr("data-raw-price", priceInt);

    // reset qty
    $("#qty").val(1);

    // qty controls
    $("#qty-decrease")
      .off("click")
      .on("click", function () {
        var v = parseInt($("#qty").val() || 1, 10);
        if (v > 1) $("#qty").val(v - 1);
      });
    $("#qty-increase")
      .off("click")
      .on("click", function () {
        var v = parseInt($("#qty").val() || 1, 10);
        $("#qty").val(v + 1);
      });

    // bind buy button
    $("#buyButton")
      .off("click")
      .on("click", function () {
        // If user not logged in (client-side quick check), redirect to login preserving current url
        try {
          if (sessionStorage.getItem("logged_in") !== "true") {
            const next = encodeURIComponent(
              window.location.pathname + window.location.search || "/product"
            );
            window.location.href = `/login?next=${next}`;
            return;
          }
        } catch (e) {
          const next = encodeURIComponent(
            window.location.pathname + window.location.search || "/product"
          );
          window.location.href = `/login?next=${next}`;
          return;
        }

        const qtyVal = parseInt($("#qty").val(), 10) || 1;
        const rawPrice =
          parseInt($("#modalPrice").attr("data-raw-price"), 10) ||
          normalizePriceToInt(product.price);

        const payload = {
          id: product.id,
          title: product.title,
          description: product.description,
          image_url: product.image_url,
          price: rawPrice,
          quantity: qtyVal,
        };

        console.log("Sending to cart:", payload); // Debug log

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

            // Show success notification (prefer compact showNotification if available)
            if (typeof showNotification === "function") {
              showNotification(
                "Produk berhasil ditambahkan ke keranjang",
                "success"
              );
            } else if (typeof Swal !== "undefined") {
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
              $badge.text(n + qtyVal);
            }
          },
          error: function (xhr) {
            console.error("add_to_cart failed", xhr);
            if (xhr && xhr.status === 401) {
              try {
                sessionStorage.removeItem("logged_in");
              } catch (e) {}
              const next = encodeURIComponent(
                window.location.pathname + window.location.search || "/product"
              );
              window.location.href = `/login?next=${next}`;
              return;
            }

            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
              alert(xhr.responseJSON.message);
            } else {
              alert(
                "Gagal memasukkan produk ke keranjang. Periksa console server untuk detil."
              );
            }
          },
        });
      });
  }
);

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
          const formattedPrice = formatRupiah(product.price);
          const productCard = `
            <div class="col-sm-6 col-md-4">
                <div class="card-product clickable" role="button"
                     data-bs-toggle="modal" data-bs-target="#productModal"
                     data-id="${id}"
                     data-title="${escapeHtml(product.title)}"
                     data-description="${escapeHtml(product.description || "")}"
                     data-image="${product.image_url}"
                     data-price="${product.price}">
                <div class="card-image">
                  <img src="${product.image_url}" alt="${
            product.title
          }" class="img-fluid" />
                </div>
                <div class="card-body d-flex flex-column justify-content-between">
                  <h5 class="card-title">${product.title}</h5>
                  <p class="card-text" style="color: #8B4513; font-weight: bold;">Harga: Rp ${formattedPrice}</p>
                    <!-- card click handles opening modal -->
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
              const formattedPrice = formatRupiah(product.price);
              const card = `
                <div class="col-sm-6 col-md-4">
                  <div class="card-product clickable" role="button"
                       data-bs-toggle="modal" data-bs-target="#productModal"
                       data-id="${id}"
                       data-title="${escapeHtml(product.title)}"
                       data-description="${escapeHtml(
                         product.description || ""
                       )}"
                       data-image="${product.image_url}"
                       data-price="${product.price}">
                    <div class="card-image">
                      <img src="${product.image_url}" alt="${escapeHtml(
                product.title
              )}" class="img-fluid" />
                    </div>
                    <div class="card-body d-flex flex-column justify-content-between">
                      <h5 class="card-title">${escapeHtml(product.title)}</h5>
                      <p class="card-text" style="color: #8B4513; font-weight: bold;">Harga: Rp ${formattedPrice}</p>
                      <!-- card click will open modal, no extra button -->
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

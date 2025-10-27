// list.js

document.addEventListener("DOMContentLoaded", () => {
  const quantityInputs = document.querySelectorAll(".quantity-input");
  const removeButtons = document.querySelectorAll(".remove-button");
  const subtotalElement = document.getElementById("subtotal");
  const totalElement = document.getElementById("total");
  // deliveryCost kept as fallback (0) — actual ongkir will come from #ekspedisi value
  let deliveryCost = 0;

  // Fungsi untuk menghitung subtotal dan total
  function calculateTotals() {
    let subtotal = 0;
    document.querySelectorAll(".row.align-items-center").forEach((row) => {
      const quantity =
        parseInt(row.querySelector(".quantity-input").value) || 1;
      // Ambil dan parse harga dengan aman, mendukung format lokal seperti "1.234.567,89" atau "Rp. 1.234.567"
      const priceRaw = row.querySelector(".col-3.text-end h5").innerText || "";
      const price = parsePrice(priceRaw) || 0;
      subtotal += quantity * price;
    });

    // Perbarui subtotal dan total di halaman
    subtotalElement.innerText = `Subtotal: Rp.${subtotal.toLocaleString()}`;
    // Ambil ongkir dari select ekspedisi bila ada, fallback ke deliveryCost (default 0)
    const ekspedisiSelect = document.getElementById("ekspedisi");
    let selectedOngkir = 0;
    if (ekspedisiSelect && ekspedisiSelect.value) {
      // nilai option diisi dengan angka (dari API). Bersihkan dulu non-digit.
      const ongkirText = String(ekspedisiSelect.value).replace(/[^\d]/g, "");
      selectedOngkir = parseInt(ongkirText) || 0;
    } else {
      selectedOngkir = deliveryCost || 0;
    }
    totalElement.innerText = `Total: Rp.${(
      subtotal + selectedOngkir
    ).toLocaleString()}`;

    // Perbarui total di modal popup (menggunakan ongkir yang dipilih)
    const modalTotalElement =
      document.querySelector("#checkoutModal #modal-total") ||
      document.getElementById("modal-total");
    if (modalTotalElement) {
      modalTotalElement.innerText = `Total: Rp.${(
        subtotal + selectedOngkir
      ).toLocaleString()}`;
    }
  }

  // Robust price parser that understands Indonesian number formats
  function parsePrice(text) {
    if (!text) return 0;
    // Keep only digits, dots, commas and minus sign
    let s = String(text)
      .replace(/[^0-9.,-]/g, "")
      .trim();

    // If there are both '.' and ',' assume '.' is thousands separator and ',' is decimal
    if (s.indexOf(".") > -1 && s.indexOf(",") > -1) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.indexOf(".") > -1 && s.indexOf(",") === -1) {
      // If only dots present, assume they are thousands separators
      s = s.replace(/\./g, "");
    } else if (s.indexOf(",") > -1 && s.indexOf(".") === -1) {
      // If only comma present, assume it's decimal separator
      s = s.replace(/,/g, ".");
    }

    const num = parseFloat(s);
    if (isNaN(num)) return 0;
    // Return rounded integer rupiah value
    return Math.round(num);
  }

  // Event listener untuk mengubah quantity
  quantityInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (parseInt(input.value) < 1) input.value = 1; // Tidak boleh kurang dari 1
      calculateTotals();
    });
  });

  // Fungsi untuk menghapus produk dari keranjang
  removeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".row.align-items-center");
      const productId = row.getAttribute("data-id");

      fetch("/remove_from_cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ product_id: productId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message.includes("successfully")) {
            row.remove(); // Hapus elemen dari DOM
            Swal.fire({
              title: "Berhasil!",
              text: data.message,
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            });
            calculateTotals(); // Perbarui total setelah penghapusan
          } else {
            Swal.fire({
              title: "Gagal!",
              text: data.message,
              icon: "error",
            });
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          Swal.fire({
            title: "Gagal!",
            text: "Terjadi kesalahan pada server.",
            icon: "error",
          });
        });
    });
  });

  // Inisialisasi perhitungan saat halaman dimuat
  calculateTotals();

  // Update payment details based on payment method
  document.getElementById("pembayaran").addEventListener("change", (event) => {
    const paymentMethod = event.target.value;
    const paymentDetailsElement = document.getElementById("payment-details");

    if (paymentMethod === "transfer") {
      paymentDetailsElement.innerHTML = `
        <p>Silakan transfer ke rekening berikut:</p>
        <p>Rek BNI: 1720036777 a/n Ucok Subejo</p>
        <p>Rek BRI: 00098663 a/n Ucok Subejo</p>
        <p>Rek MANDIRI: 33388686486 a/n Ucok Subejo</p>
        <div class="mb-3">
          <label for="formFile" class="form-label fw-bold">Untuk Bukti Transfer Bisa Kirim ke WhatsApp, Bisa Cek di Bagian Contact Ya!!</label>
        </div>
      `;
    } else if (paymentMethod === "ewallet") {
      paymentDetailsElement.innerHTML = `
        <p>Silakan gunakan QR code berikut untuk pembayaran melalui DANA : 085972855010</p>
        <div class="mb-3 mt-2">
          <label for="formFile" class="form-label fw-bold">Untuk Bukti Transfer Bisa Kirim ke WhatsApp, Bisa Cek di Bagian Contact Ya!!</label>
        </div>
      `;
    } else {
      paymentDetailsElement.innerHTML =
        "<p>Pilih metode pembayaran yang diinginkan.</p>";
    }
  });
});

// === Load Provinsi saat halaman dibuka ===
fetch("/get_provinsi")
  .then((res) => res.json())
  .then((data) => {
    const provSelect = document.getElementById("provinsi");
    data.forEach((prov) => {
      const opt = document.createElement("option");
      opt.value = prov;
      opt.textContent = prov;
      provSelect.appendChild(opt);
    });
  });

// === Load Kota saat Provinsi dipilih ===
document.getElementById("provinsi").addEventListener("change", (e) => {
  const provinsi = e.target.value;
  const kotaSelect = document.getElementById("kota");
  kotaSelect.innerHTML = "<option selected>Pilih Kota</option>";

  if (!provinsi) return;
  fetch(`/get_kota/${encodeURIComponent(provinsi)}`)
    .then((res) => res.json())
    .then((data) => {
      data.forEach((kota) => {
        const opt = document.createElement("option");
        opt.value = kota.id; // gunakan ID kota sebagai nilai
        opt.textContent = kota.nama_kota;
        kotaSelect.appendChild(opt);
      });
      kotaSelect.disabled = false;
    });
});

// === Ambil Ongkir dari Flask & API RajaOngkir ===
document.getElementById("pembayaran").addEventListener("change", async (e) => {
  const pembayaran = e.target.value;
  const kotaTujuan = document.getElementById("kota").value;

  if (!kotaTujuan || pembayaran === "Pilih Metode Pembayaran") {
    Swal.fire("Pilih Kota dan Metode Pembayaran terlebih dahulu");
    return;
  }

  const totalQty = Array.from(
    document.querySelectorAll(".quantity-input")
  ).reduce((sum, el) => sum + parseInt(el.value), 0);
  let weight = totalQty * 200;
  if (weight < 1000) weight = 1000;
  const origin = 78; // ID kota asal toko kamu

  try {
    const response = await fetch("/get_ongkir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination: kotaTujuan, weight }),
    });

    const result = await response.json();
    console.log("API Ongkir Response:", result); // 🔍 Debug di console browser

    const ekspedisiSelect = document.getElementById("ekspedisi");
    ekspedisiSelect.innerHTML = "<option selected>Pilih Ekspedisi</option>";

    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((item) => {
        const opt = document.createElement("option");
        // Simpan nilai cost sebagai angka (tanpa pemformatan). item.cost bisa number.
        opt.value = item.cost;
        opt.textContent = `${item.name} - ${item.service} (Rp.${Number(
          item.cost
        ).toLocaleString()})`;
        ekspedisiSelect.appendChild(opt);
      });
      ekspedisiSelect.disabled = false;
      Swal.fire("Pilih ekspedisi yang kamu inginkan dari daftar.");
    } else {
      Swal.fire("Tidak ada data ongkir yang diterima dari server.");
      console.warn("Response format tidak sesuai:", result);
    }
  } catch (error) {
    console.error("Error mengambil ongkir:", error);
    Swal.fire("Gagal mengambil ongkir. Silakan coba lagi.");
  }
});

// === Update total ketika ekspedisi dipilih ===
document.getElementById("ekspedisi").addEventListener("change", (e) => {
  // Saat user memilih ekspedisi, perbarui tampilan ongkir lalu hitung ulang totals
  const raw = String(e.target.value || "").replace(/[^\d]/g, "");
  const ongkir = parseInt(raw) || 0;

  const ongkirElem = document.getElementById("Ongkir");
  if (ongkirElem)
    ongkirElem.innerText = `Biaya Ongkir: Rp.${ongkir.toLocaleString()}`;

  // update deliveryCost fallback agar calculateTotals juga melihatnya
  deliveryCost = ongkir;

  // hitung ulang subtotal+total — calculateTotals akan memperbarui #Ongkir, #total, dan modal
  calculateTotals();
});

// Pastikan saat modal checkout dibuka, totals terupdate (subtotal + ongkir)
const checkoutModal = document.getElementById("checkoutModal");
if (checkoutModal) {
  // Jika menggunakan Bootstrap modal: listen to show.bs.modal
  try {
    checkoutModal.addEventListener("show.bs.modal", () => {
      calculateTotals();
    });
  } catch (e) {
    // fallback — beberapa implementasi tidak melempar event ini pada element langsung
  }
}

// Jika ada tombol dengan id 'checkout' yang membuka modal, pastikan calculateTotals dipanggil saat diklik
const checkoutBtn = document.getElementById("checkout");
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", () => {
    calculateTotals();
  });
}

// === Submit Order ===

document.getElementById("submit-order").addEventListener("click", async () => {
  const nama = document.getElementById("nama").value;
  const alamat = document.getElementById("alamat").value;
  const kodepos = document.getElementById("kodepos").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const pembayaran = document.getElementById("pembayaran").value;

  // Mengambil produk dalam keranjang dan menghitung total harga
  const cartItems = Array.from(document.querySelectorAll("[data-id]")).map(
    (row) => {
      const id = row.getAttribute("data-id");
      const title = row.querySelector("h5").innerText;
      const quantity =
        parseInt(row.querySelector(".quantity-input").value) || 0;
      const priceText = row
        .querySelector(".col-3.text-end h5")
        .innerText.replace(/[^\d]/g, "");
      const price = parseInt(priceText) || 0;
      return { id, title, quantity, price };
    }
  );

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  // Ambil ongkir dari pilihan ekspedisi jika tersedia.
  const ekspedisiSelect = document.getElementById("ekspedisi");
  let selectedOngkirRaw = ekspedisiSelect ? String(ekspedisiSelect.value) : "";
  selectedOngkirRaw = selectedOngkirRaw.replace(/[^\d]/g, "");
  let ongkir = parseInt(selectedOngkirRaw) || 0;
  // Jika ekspedisi belum dipilih atau value tidak tersedia, fallback ke deliveryCost (di-set saat memilih ekspedisi)
  if (!ongkir && typeof deliveryCost !== "undefined")
    ongkir = parseInt(deliveryCost) || 0;
  // Jika masih 0, coba baca dari elemen tampilan "Ongkir" (mis. 'Biaya Ongkir: Rp.20.000')
  if (!ongkir) {
    const ongkirElem = document.getElementById("Ongkir");
    if (ongkirElem) {
      const txt = ongkirElem.innerText.replace(/[^\d]/g, "");
      ongkir = parseInt(txt) || 0;
    }
  }
  const amount = subtotal + ongkir; // Total amount (subtotal + ongkir)
  const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const payload = {
    nama,
    alamat,
    kodepos,
    whatsapp,
    pembayaran,
    produk: cartItems,
    amount,
    ongkir,
    quantity,
  };

  // SweetAlert untuk konfirmasi
  Swal.fire({
    title: "Apakah Anda yakin?",
    text: `Total yang harus dibayar adalah Rp.${amount.toLocaleString(
      "id-ID"
    )}`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Order",
    cancelButtonText: "Batal",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const response = await fetch("/submit_checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (response.ok) {
          Swal.fire(
            "Terima Kasih!",
            "Order Anda berhasil disimpan.",
            "success"
          );
          document.querySelectorAll("[data-id]").forEach((row) => row.remove()); // Bersihkan keranjang
        } else {
          Swal.fire("Gagal!", result.message, "error");
        }
      } catch (error) {
        console.error("Error:", error);
        Swal.fire("Gagal!", "Terjadi kesalahan. Silakan coba lagi.", "error");
      }
    } else {
      Swal.fire("Dibatalkan", "Order Anda telah dibatalkan.", "info");
    }
  });
});

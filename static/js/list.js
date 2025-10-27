// list.js

document.addEventListener("DOMContentLoaded", () => {
  const quantityInputs = document.querySelectorAll(".quantity-input");
  const removeButtons = document.querySelectorAll(".remove-button");
  const subtotalElement = document.getElementById("subtotal");
  const totalElement = document.getElementById("total");
  const deliveryCost = 20000; // Biaya pengiriman tetap

  // Fungsi untuk menghitung subtotal dan total
  function calculateTotals() {
    let subtotal = 0;
    document.querySelectorAll(".row.align-items-center").forEach((row) => {
      const quantity =
        parseInt(row.querySelector(".quantity-input").value) || 1;
      const price = parseInt(
        row
          .querySelector(".col-3.text-end h5")
          .innerText.replace("Rp.", "")
          .replace(".", "")
          .trim()
      );
      subtotal += quantity * price;
    });

    // Perbarui subtotal dan total di halaman
    subtotalElement.innerText = `Subtotal: Rp.${subtotal.toLocaleString()}`;
    totalElement.innerText = `Total: Rp.${(
      subtotal + deliveryCost
    ).toLocaleString()}`;

    // Perbarui total di modal popup
    const modalTotalElement = document.querySelector("#checkoutModal #total");
    if (modalTotalElement) {
      modalTotalElement.innerText = `Total: Rp.${(
        subtotal + deliveryCost
      ).toLocaleString()}`;
    }
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
        opt.value = item.cost;
        opt.textContent = `${item.name} - ${
          item.service
        } (Rp.${item.cost.toLocaleString()})`;
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
  const ongkir = parseInt(e.target.value);
  const subtotalText = document
    .getElementById("subtotal")
    .innerText.replace("Subtotal: Rp.", "")
    .replace(/\./g, "");
  const subtotal = parseInt(subtotalText);
  const total = subtotal + ongkir;

  document.getElementById(
    "Ongkir"
  ).innerText = `Biaya Ongkir: Rp.${ongkir.toLocaleString()}`;
  document.getElementById(
    "total"
  ).innerText = `Total: Rp.${total.toLocaleString()}`;

  const modalTotal = document.querySelector("#checkoutModal #total");
  modalTotal.innerText = `Total: Rp.${total.toLocaleString()}`;
});

// === Submit Order ===
document.getElementById("submit-order").addEventListener("click", async () => {
  const nama = document.getElementById("nama").value;
  const alamat = document.getElementById("alamat").value;
  const kodepos = document.getElementById("kodepos").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const pembayaran = document.getElementById("pembayaran").value;

  const cartItems = Array.from(document.querySelectorAll("[data-id]")).map(
    (row) => {
      const id = row.getAttribute("data-id");
      const title = row.querySelector("h5").innerText;
      const quantity = parseInt(row.querySelector(".quantity-input").value);
      const price = parseInt(
        row
          .querySelector(".col-3.text-end h5")
          .innerText.replace("Rp.", "")
          .replace(",", "")
      );
      return { id, title, quantity, price };
    }
  );

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const ongkirText =
    document.getElementById("Ongkir").innerText || "Biaya Ongkir: Rp.20000";
  const ongkir = parseInt(
    ongkirText.replace("Biaya Ongkir: Rp.", "").replace(/\./g, "")
  );
  const amount = subtotal + ongkir;
  const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const payload = {
    nama,
    alamat,
    kodepos,
    whatsapp,
    pembayaran,
    produk: cartItems,
    amount,
    quantity,
  };

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (response.ok) {
          Swal.fire(
            "Terima Kasih!",
            "Order Anda berhasil disimpan.",
            "success"
          );
          document.querySelectorAll("[data-id]").forEach((row) => row.remove());
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
      const quantity = parseInt(row.querySelector(".quantity-input").value);
      const price = parseInt(
        row
          .querySelector(".col-3.text-end h5")
          .innerText.replace("Rp.", "")
          .replace(",", "")
      );
      return { id, title, quantity, price };
    }
  );

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const ongkir = 20000; // Contoh biaya ongkir tetap
  const amount = subtotal + ongkir; // Total amount
  const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const payload = {
    nama,
    alamat,
    kodepos,
    whatsapp,
    pembayaran,
    produk: cartItems,
    amount,
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

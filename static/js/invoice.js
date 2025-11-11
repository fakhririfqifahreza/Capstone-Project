let currentInvoiceId = null;
let currentInvoiceStatus = null;

// Handle View button clicks
document.querySelectorAll(".btn-view-invoice").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.stopPropagation(); // Prevent event bubbling
    const invoiceId = btn.getAttribute("data-invoice-id");
    const row = btn.closest("tr");
    const status = row.getAttribute("data-status");

    currentInvoiceId = invoiceId;
    currentInvoiceStatus = status;

    // Mengirim permintaan AJAX untuk mendapatkan detail invoice
    try {
      const response = await fetch(`/get_invoice_details/${invoiceId}`);
      const data = await response.json();

      if (response.ok) {
        // Mengosongkan tabel sebelumnya
        document.getElementById("popup-details").innerHTML = "";
        document.getElementById("popup-invoice-id").textContent = invoiceId;
        document.getElementById("popup-status").textContent = status;

        // Memastikan data.details ada dan berupa array
        if (Array.isArray(data.details)) {
          data.details.forEach((item) => {
            document.getElementById("popup-details").innerHTML += `
                          <tr>
                              <td>${item.title}</td>
                              <td>${item.quantity}</td>
                              <td>Rp. ${item.price.toLocaleString()}</td>
                          </tr>
                      `;
          });

          // Show/hide Mark as Complete button based on status
          const completeBtn = document.getElementById("mark-complete-btn");
          if (
            status === "Completed" ||
            status === "Complete" ||
            status === "Cancelled" ||
            status === "Rejected"
          ) {
            completeBtn.style.display = "none";
          } else {
            completeBtn.style.display = "inline-block";
          }

          // Menampilkan pop-up
          document.getElementById("popup").style.display = "flex";
        } else {
          Swal.fire("Error", "Data produk tidak tersedia", "error");
        }
      } else {
        Swal.fire(
          "Error",
          data.message || "Terjadi kesalahan saat mengambil data invoice.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      Swal.fire(
        "Error",
        "Terjadi kesalahan saat mengambil data invoice.",
        "error"
      );
    }
  });
});

// Handle Mark as Complete button
document
  .getElementById("mark-complete-btn")
  .addEventListener("click", async () => {
    // Get invoice ID from the popup display (fallback if currentInvoiceId is not set)
    const invoiceIdFromPopup = document
      .getElementById("popup-invoice-id")
      .textContent.trim();
    const invoiceId = currentInvoiceId || invoiceIdFromPopup;

    console.log("Invoice ID from variable:", currentInvoiceId);
    console.log("Invoice ID from popup:", invoiceIdFromPopup);
    console.log("Using Invoice ID:", invoiceId);

    if (!invoiceId) {
      Swal.fire("Error", "Invoice ID tidak ditemukan", "error");
      return;
    }

    // Confirm action with user using SweetAlert2
    Swal.fire({
      title: "Are you sure?",
      text: "You are about to change the status to Completed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, update!",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        console.log("Sending request with invoice_id:", invoiceId);
        try {
          const requestBody = {
            invoice_id: invoiceId,
            status: "Completed",
          };
          console.log("Request body:", JSON.stringify(requestBody));

          const response = await fetch("/update_order_status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          console.log("Server response:", data);

          if (response.ok) {
            Swal.fire(
              "Success",
              data.message || "Status berhasil diubah menjadi Complete!",
              "success"
            ).then(() => {
              // Close popup and reload page
              document.getElementById("popup").style.display = "none";
              location.reload();
            });
          } else {
            Swal.fire(
              "Error",
              data.message || "Gagal mengubah status",
              "error"
            );
          }
        } catch (error) {
          console.error("Error updating status:", error);
          Swal.fire("Error", "Terjadi kesalahan saat mengubah status", "error");
        }
      }
    });
  });

// Tombol tutup pop-up
document.getElementById("close-popup").addEventListener("click", () => {
  document.getElementById("popup").style.display = "none";
  currentInvoiceId = null;
  currentInvoiceStatus = null;
});

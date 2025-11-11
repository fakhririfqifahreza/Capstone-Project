$(document).ready(function () {
  // Show Pop-Up with Invoice Details
  $(".btn-view").click(function () {
    const invoiceId = $(this).data("id"); // Ambil invoice ID

    // Fetch invoice details from backend
    $.get(`/get_invoice_details/${invoiceId}`, function (data) {
      if (data.details) {
        $("#popup-invoice-id").text(invoiceId); // Tambahkan ID ini
        $("#popup-status").text(data.status); // Setel status awal
        let rows = "";
        data.details.forEach(function (item) {
          rows += `<tr><td>${item.title}</td><td>${
            item.quantity
          }</td><td>Rp. ${item.price.toLocaleString()}</td></tr>`;
        });
        $("#popup-details").html(rows);
        $("#popup").removeClass("d-none");
      } else {
        Swal.fire("Error", "Data produk tidak tersedia", "error");
      }
    }).fail(function () {
      Swal.fire(
        "Error",
        "Terjadi kesalahan saat mengambil data invoice.",
        "error"
      );
    });
  });

  // Handle Approve and Reject buttons
  $("#approve-btn").click(function () {
    updateOrderStatus("Process");
  });
  $("#reject-btn").click(function () {
    updateOrderStatus("Cancelled");
  });

  // Function to update order status
  function updateOrderStatus(newStatus) {
    const invoiceId = $("#popup-invoice-id").text(); // Ambil invoice ID dari modal
    console.log("Invoice ID sent to backend:", invoiceId);

    // Tampilkan konfirmasi
    Swal.fire({
      title: "Are you sure?",
      text: `You are about to change the status to ${newStatus}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, update!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        // Kirim request AJAX
        $.ajax({
          url: "/update_order_status",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({
            invoice_id: invoiceId,
            status: newStatus,
          }),
          success: function (response) {
            console.log("Server Response:", response);
            Swal.fire("Success", response.message, "success");

            // Update status di tabel dan pop-up
            $(`tr[data-invoice-id="${invoiceId}"] .status`).text(newStatus);
            $(`tr[data-invoice-id="${invoiceId}"] .status`)
              .removeClass()
              .addClass("status " + newStatus.toLowerCase());
            $("#popup-status").text(newStatus);
            $("#popup").addClass("d-none"); // Tutup pop-up modal
          },
          error: function (xhr) {
            console.error("Error:", xhr.responseText);
            Swal.fire(
              "Error",
              xhr.responseText || "Terjadi kesalahan.",
              "error"
            );
          },
        });
      }
    });
  }

  // Close Pop-Up
  $("#close-popup").click(function () {
    $("#popup").addClass("d-none");
  });

  // Function to update total income and top products
  function updateIncomeAndTopProducts() {
    // Fetch total income
    $.get("/get_total_income", function (data) {
      let incomeRows = "";
      data.forEach(function (item) {
        let monthName = new Date(2024, item._id - 1, 1).toLocaleString(
          "default",
          { month: "long" }
        );
        incomeRows += `<tr><td>${monthName}</td><td>Rp. ${item.total_income.toLocaleString()}</td></tr>`;
      });
      $(".total-income tbody").html(incomeRows);
    }).fail(function () {
      Swal.fire(
        "Error",
        "Terjadi kesalahan saat mengambil data total income.",
        "error"
      );
    });

    // Fetch top products
    $.get("/get_top_products", function (data) {
      let productRows = "";
      data.forEach(function (item) {
        productRows += `<tr><td>${item._id}</td><td>${item.quantity_sold}</td></tr>`;
      });
      $("#top-products").html(productRows);
    }).fail(function () {
      Swal.fire(
        "Error",
        "Terjadi kesalahan saat mengambil data produk paling laris.",
        "error"
      );
    });
  }

  // Initial load of top products and total income
  updateIncomeAndTopProducts();
});

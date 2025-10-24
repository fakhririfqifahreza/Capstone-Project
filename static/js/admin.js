$(document).ready(function () {
    // Navigation
    $("#products-link").click(function () {
      $("#products-section").removeClass("d-none");
      $("#invoices-section").addClass("d-none");
      $(".nav-link").removeClass("active");
      $(this).addClass("active");
    });
  
    $("#invoices-link").click(function () {
      $("#invoices-section").removeClass("d-none");
      $("#products-section").addClass("d-none");
      $(".nav-link").removeClass("active");
      $(this).addClass("active");
    });
  
    // Add product
    $("#product-form").submit(function (e) {
      e.preventDefault();
      const name = $("#product-name").val().trim();
      const price = $("#product-price").val().trim();
      const description = $("#product-description").val().trim();
  
      if (name && price && description) {
        const newRow = `
          <tr>
            <td>${name}</td>
            <td>${price}</td>
            <td>${description}</td>
            <td>
              <button class="btn btn-danger btn-sm delete-btn">Delete</button>
            </td>
          </tr>
        `;
        $("#product-list").append(newRow);
  
        // Clear input fields
        $("#product-name").val('');
        $("#product-price").val('');
        $("#product-description").val('');
      }
    });
  
    // Delete product
    $(document).on("click", ".delete-btn", function () {
      $(this).closest("tr").remove();
    });
  });
  
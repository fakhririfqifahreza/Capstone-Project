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
    $(document).on("click", ".delete-product", function () {
        $(this).closest(".col-sm-6").remove();
      });
    
      // Fungsi untuk menambah produk baru
      $("#addProductForm").on("submit", function (e) {
        e.preventDefault();
    
        // Ambil data dari form
        const title = $("#productTitle").val();
        const description = $("#productDescription").val();
        const image = $("#productImage").val();
    
        // Template kartu produk baru
        const newProduct = `
          <div class="col-sm-6 col-md-4">
            <div class="card-product">
              <div class="card-image">
                <img src="${image}" alt="${title}" class="img-fluid" />
              </div>
              <div class="card-body d-flex flex-column justify-content-between">
                <h5 class="card-title">${title}</h5>
                <p>${description}</p>
                <a
                  href="${image}"
                  class="button-product mt-3"
                  data-bs-toggle="modal"
                  data-bs-target="#productModal"
                  data-title="${title}"
                  data-description="${description}"
                  data-image="${image}"
                >
                  Lihat Detail
                </a>
                <button class="btn btn-danger mt-2 delete-product">Hapus Produk</button>
              </div>
            </div>
          </div>
        `;
    
        // Tambahkan kartu produk baru ke dalam daftar produk
        $("#product .row").append(newProduct);
    
        // Reset form
        $("#addProductForm")[0].reset();
      });
  });
// Populate Modal with Product Data
const productModal = document.getElementById('productModal');
productModal.addEventListener('show.bs.modal', (event) => {
    const button = event.relatedTarget;
    const id = button.getAttribute('data-id');
    const title = button.getAttribute('data-title');
    const description = button.getAttribute('data-description');
    const image = button.getAttribute('data-image');
    const price = button.getAttribute('data-price');
    
    const modalTitle = productModal.querySelector('#modalTitle');
    const modalDescription = productModal.querySelector('#modalDescription');
    const modalImage = productModal.querySelector('#modalImage');
    const modalPrice = productModal.querySelector('#modalPrice');
    const editForm = productModal.querySelector('#editForm');
    const deleteForm = productModal.querySelector('#deleteForm');
    
    modalTitle.textContent = title;
    modalDescription.textContent = description;
    modalImage.src = image;
    modalPrice.textContent = `Harga: Rp ${price}`;
    
    // Set the action URLs dynamically
    editForm.action = `/admin/products/update/${id}`;
    deleteForm.action = `/admin/products/delete/${id}`;
});

document.addEventListener("DOMContentLoaded", function () {
    // Ambil parameter ID produk dari URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");
  
    // Dummy data produk (untuk simulasi, biasanya data ini didapat dari backend)
    const products = [
      {
        id: "1",
        title: "Bahan Kain Seragam Batik Modern Motif",
        description: "Kain batik berkualitas tinggi dengan motif modern.",
        image: "product/1.jpg",
      },
      {
        id: "2",
        title: "Bahan Kain Seragam Batik Modern Hitam",
        description: "Kain batik hitam berkualitas tinggi dengan motif modern.",
        image: "product/2.jpg",
      },
    ];
  
    // Temukan produk berdasarkan ID
    const product = products.find((p) => p.id === productId);
  
    if (product) {
      // Isi form dengan data produk
      document.getElementById("productTitle").value = product.title;
      document.getElementById("productDescription").value = product.description;
    }
  
    // Form submission
    document.getElementById("editProductForm").addEventListener("submit", function (e) {
      e.preventDefault();
  
      // Ambil data baru dari form
      const updatedProduct = {
        title: document.getElementById("productTitle").value,
        description: document.getElementById("productDescription").value,
      };
  
      // Simpan data (untuk simulasi, hanya log ke console)
      console.log("Produk diperbarui:", updatedProduct);
  
      // Redirect ke halaman produk (atau tampilkan pesan sukses)
      alert("Produk berhasil diperbarui!");
      window.location.href = "product.html";
    });
  });
  
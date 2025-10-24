document.querySelectorAll('.table tbody tr').forEach(row => {
  row.addEventListener('click', async () => {
    const invoiceId = row.cells[0].innerText; // Mengambil ID invoice

    // Mengirim permintaan AJAX untuk mendapatkan detail invoice
    try {
      const response = await fetch(`/get_invoice_details/${invoiceId}`);
      const data = await response.json();

      if (response.ok) {
        // Mengosongkan tabel sebelumnya
        document.getElementById('popup-details').innerHTML = '';

        // Memastikan data.details ada dan berupa array
        if (Array.isArray(data.details)) {
          data.details.forEach(item => {
            document.getElementById('popup-details').innerHTML += `
                          <tr>
                              <td>${item.title}</td>
                              <td>${item.quantity}</td>
                              <td>Rp. ${item.price.toLocaleString()}</td>
                          </tr>
                      `;
          });

          // Menampilkan pop-up
          document.getElementById('popup').style.display = 'flex';
        } else {
          alert('Data produk tidak tersedia');
        }
      } else {
        alert(data.message || 'Terjadi kesalahan saat mengambil data invoice.');
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      alert('Terjadi kesalahan saat mengambil data invoice.');
    }
  });
});

// Tombol tutup pop-up
document.getElementById('close-popup').addEventListener('click', () => {
  document.getElementById('popup').style.display = 'none';
});

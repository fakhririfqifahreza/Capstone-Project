$(document).ready(function () {
    $('#login-form').on('submit', function (e) {
        e.preventDefault();

        const email = $('#email').val().trim();
        const password = $('#password').val().trim();

        if (!email || !password) {
            Swal.fire('Oops!', 'Email dan password harus diisi.', 'warning');
            return;
        }

        $.ajax({
            url: '/login',
            method: 'POST',
            data: { email: email, password: password },
            success: function (response) {
                if (response.success) {
                    Swal.fire({
                        title: 'Berhasil!',
                        text: response.message,
                        icon: 'success',
                        position: 'top',
                        timer: 2000,
                        showConfirmButton: false,
                    }).then(() => {
                        window.location.href = response.redirect_url;  // Redirect ke halaman yang sesuai
                    });
                } else {
                    Swal.fire('Gagal!', response.message, 'error');
                }
            },
            error: function () {
                Swal.fire('Gagal!', 'Terjadi kesalahan, coba lagi.', 'error');
            },
        });
    });
});

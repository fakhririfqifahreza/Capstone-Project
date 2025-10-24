$(document).ready(function () {
    $('#register-form').on('submit', function (e) {
        e.preventDefault();

        const name = $('#name').val().trim();
        const email = $('#email').val().trim();
        const password = $('#password').val().trim();
        const confirmPassword = $('#confirm_password').val().trim();
        const role = $('#role').val();

        if (!name || !email || !password || !confirmPassword) {
            Swal.fire('Oops!', 'Semua field harus diisi!', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            Swal.fire('Oops!', 'Password tidak cocok!', 'error');
            return;
        }

        $.ajax({
            url: '/register',
            method: 'POST',
            data: { name: name, email: email, password: password, role: role },
            success: function (response) {
                Swal.fire('Berhasil!', 'Registrasi berhasil!', 'success').then(() => {
                    window.location.href = '/login';  // Redirect ke halaman login setelah registrasi
                });
            },
            error: function (error) {
                Swal.fire('Gagal!', 'Terjadi kesalahan, coba lagi!', 'error');
            }
        });
    });
});

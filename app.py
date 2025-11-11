import os
import requests
from os.path import join, dirname
from dotenv import load_dotenv
import bcrypt
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from pymongo import MongoClient
from bson.objectid import ObjectId
from flask_bcrypt import Bcrypt
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "batik_db")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
db_kota = client["db_kota"]  # Database untuk data kota/provinsi
kota_collection = db_kota["kota"]

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default_secret_key")
bcrypt = Bcrypt(app)

app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def save_avatar(file):
    """Save an avatar file and return its relative path."""
    if not file or not allowed_file(file.filename):
        return None
        
    try:
        # Generate secure filename with timestamp and unique ID
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{timestamp}{unique_id}_{filename}"
        
        # Ensure uploads folder exists in static folder
        upload_path = os.path.join(app.static_folder, 'uploads')
        os.makedirs(upload_path, exist_ok=True)
        
        # Save file in static/uploads directory
        filepath = os.path.join(upload_path, filename)
        file.save(filepath)
        
        # Return relative path for database storage
        return 'uploads/' + filename
        
    except Exception as e:
        print(f"Error saving avatar: {e}")
        return None

@app.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({'error': 'No avatar file uploaded'}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    # Get user ID from session
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401

    try:
        # Get user to check existing avatar
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Delete old avatar if it exists
        if user.get('avatar'):
            old_avatar_path = os.path.join(app.static_folder, user['avatar'])
            try:
                if os.path.exists(old_avatar_path):
                    os.remove(old_avatar_path)
            except Exception as e:
                print(f"Warning - Failed to delete old avatar: {e}")

        # Save new avatar
        avatar_path = save_avatar(file)
        if not avatar_path:
            return jsonify({'error': 'Failed to save avatar'}), 500

        # Update user in database with new avatar path
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'avatar': avatar_path}}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Avatar berhasil diperbarui',
                'avatar': avatar_path
            }), 200
        else:
            # Try to delete the newly saved avatar since db update failed
            try:
                new_avatar_path = os.path.join(app.static_folder, avatar_path)
                if os.path.exists(new_avatar_path):
                    os.remove(new_avatar_path)
            except:
                pass
            return jsonify({'error': 'Gagal memperbarui avatar di database'}), 500

    except Exception as e:
        print(f"Error in upload_avatar: {e}")
        return jsonify({'error': 'Terjadi kesalahan saat menyimpan avatar'}), 500


def _get_cart_owner():
    """Return a stable owner identifier for cart items.
    Priority:
    - logged in user -> "user:{user_id}"
    - guest session -> "guest:{uuid}"
    The value is stored in session for guest so it's stable across requests.
    """
    # prefer permanent user id when logged in
    user_id = session.get('user_id')
    if user_id:
        return f"user:{user_id}"

    # fallback to a generated cart session id stored in session
    cart_sid = session.get('cart_session_id')
    if not cart_sid:
        cart_sid = str(uuid.uuid4())
        session['cart_session_id'] = cart_sid
    return f"guest:{cart_sid}"


def parse_price_to_int(value):
    """Normalize various price representations to integer rupiah.

    Accepts integers, floats, or strings like "Rp. 1.234.567,89" or "200000".
    Returns integer (rounded) or 0 on failure.
    """
    import re

    if value is None:
        return 0
    # If already numeric
    if isinstance(value, (int,)):
        return int(value)
    if isinstance(value, float):
        return int(round(value))

    s = str(value)
    # remove currency symbols and whitespace, keep digits, dots, commas and minus
    s = re.sub(r"[^0-9.,-]", "", s).strip()
    if not s:
        return 0

    try:
        if '.' in s and ',' in s:
            # assume '.' thousands, ',' decimal
            s = s.replace('.', '').replace(',', '.')
        elif '.' in s and ',' not in s:
            # assume '.' thousands sep
            s = s.replace('.', '')
        elif ',' in s and '.' not in s:
            # assume ',' is decimal separator
            s = s.replace(',', '.')

        num = float(s)
        return int(round(num))
    except Exception:
        try:
            return int(float(s.replace(',', '.')))
        except Exception:
            return 0

for review in db.reviews.find():
    print(review)

# Route untuk halaman login
@app.route('/login', methods=['POST', 'GET'])
def login():
    # If POST (AJAX or form), return JSON so frontend can handle notifications
    if request.method == 'POST':
        # Support both form-encoded and JSON bodies
        data = request.get_json(silent=True) or request.form
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'success': False, 'message': 'Email dan password harus diisi'})

        user = db.users.find_one({'email': email})
        if not user or not bcrypt.check_password_hash(user['password'], password):
            return jsonify({'success': False, 'message': 'Email atau password salah'})

        # Save session
        session['logged_in'] = True
        session['user_id'] = str(user['_id'])
        session['role'] = user.get('role')
        session['nama'] = user.get('name')

        # Respond with redirect URL for frontend
        if user.get('role') == 'admin':
            return jsonify({'success': True, 'redirect_url': url_for('admin_home'), 'message': f"Selamat Datang {user.get('name')}!"})
        return jsonify({'success': True, 'redirect_url': url_for('homepage'), 'message': f"Selamat Datang {user.get('name')}!"})

    # GET -> render unified auth page
    return render_template('logreg.html')

# Route untuk halaman register
@app.route('/register', methods=['GET', 'POST'])
def register():
    # Handle POST from AJAX or regular form
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        role = data.get('role') or 'customer'

        # Validation
        if not name or not email or not password or not confirm_password:
            return jsonify({'success': False, 'message': 'Semua field harus diisi'})
        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Password tidak cocok'})
        if db.users.find_one({'email': email}):
            return jsonify({'success': False, 'message': 'Email sudah digunakan'})

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = {'name': name, 'email': email, 'password': hashed_password, 'role': role}
        db.users.insert_one(user)

        return jsonify({'success': True, 'message': 'Registrasi berhasil! Silakan login.'})

    # GET -> render unified auth page
    return render_template('logreg.html')
@app.route('/auth')
def auth():
    # Render unified auth page (contains both login & register panels)
    return render_template('logreg.html')

def _valid_phone(phone: str) -> bool:
    """Basic server-side phone number validation (Indonesia-centric)."""
    import re
    if not phone:
        return False
    # allow +62 or 0 at start, digits and optional spaces/dashes
    phone = phone.replace(' ', '').replace('-', '')
    return re.match(r'^(?:\+62|0)\d{8,15}$', phone) is not None

@app.route('/')
def homepage():
    products = db.products.find()
    return render_template('index.html', products=products, logged_in=session.get('logged_in', False))

@app.route('/submit_review', methods=['POST'])
def submit_review():
    name = request.form.get('name')
    review = request.form.get('review')

    print(f"Name: {name}, Review: {review}")  # Log data yang diterima

    if not name or not review:
        return redirect(url_for('homepage', error="Semua field harus diisi"))

    # Simpan review ke database
    db.reviews.insert_one({
        "name": name,
        "review": review
    })

    print("Review berhasil disimpan!")  # Log sukses menyimpan

    # Redirect dengan parameter success
    return redirect(url_for('homepage', success="true"))

@app.route("/product")
def product():
    # Allow guests to view the product listing. Adding to cart requires login.
    products = db.products.find()
    return render_template("product.html", products=products, logged_in=session.get('logged_in', False))

@app.route('/filter_products', methods=['GET'])
def filter_products():
    filter_type = request.args.get('filter')

    if filter_type == "termurah":
        products = db.products.find().sort("price", 1)  # Sortir harga termurah
    elif filter_type == "termahal":
        products = db.products.find().sort("price", -1)  # Sortir harga termahal
    else:
        products = db.products.find()  # Semua produk

    # Ubah data menjadi list
    products_list = [
        {
            "id": str(product["_id"]),
            "title": product["title"],
            "description": product["description"],
            "price": product["price"],
            "image_url": product["image_url"]
        }
        for product in products
    ]

    return jsonify(products_list)


@app.route('/search_products', methods=['GET'])
def search_products():
    q = request.args.get('q', '').strip()
    if not q:
        # return all products if query empty
        products = db.products.find()
    else:
        # Case-insensitive regex search on title and description
        import re
        regex = re.compile(re.escape(q), re.IGNORECASE)
        products = db.products.find({
            "$or": [
                {"title": {"$regex": regex}},
                {"description": {"$regex": regex}}
            ]
        })

    products_list = [
        {
            "id": str(p.get("_id")),
            "title": p.get("title", ""),
            "description": p.get("description", ""),
            "price": p.get("price", "0"),
            "image_url": p.get("image_url", "")
        }
        for p in products
    ]
    return jsonify(products_list)

@app.route("/add_to_cart", methods=["POST"])
def add_to_cart():
    try:
        # Enforce login on server side for adding to cart
        if not session.get('logged_in'):
            return jsonify({'success': False, 'message': 'Silakan login terlebih dahulu untuk menambahkan produk ke keranjang.'}), 401

        data = request.json or {}
        owner = _get_cart_owner()

        cart_item = {
            "owner": owner,
            "product_id": data.get("id") or data.get("product_id"),
            "title": data.get("title"),
            "description": data.get("description"),
            "image_url": data.get("image_url") or data.get("image"),
            "price": parse_price_to_int(data.get("price") or 0),
            "quantity": int(data.get("quantity") or 1),
            "created_at": datetime.now(),
        }

        result = db.cart.insert_one(cart_item)
        return jsonify({"message": "Product added to cart successfully!", "cart_id": str(result.inserted_id)}), 200
    except Exception as e:
        print(f"Error in add_to_cart: {e}")
        return jsonify({"message": "Failed to add product to cart."}), 500

@app.route('/remove_from_cart', methods=['POST'])
def remove_from_cart():
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        if not product_id:
            return jsonify({"message": "Product ID not provided"}), 400
        owner = _get_cart_owner()
        result = db.cart.delete_one({"_id": ObjectId(product_id), "owner": owner})
        if result.deleted_count > 0:
            return jsonify({"message": "Product successfully removed from cart"})
        else:
            return jsonify({"message": "Product not found"}), 404
    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({"message": "An error occurred while removing the product"}), 500

@app.route("/list")
def cart():
    owner = _get_cart_owner()
    cart_items = list(db.cart.find({"owner": owner}))
    return render_template("list.html", cart_items=cart_items)

@app.route("/get_provinsi", methods=["GET"])
def get_provinsi():
    provinsi_list = kota_collection.distinct("nama_provinsi")
    return jsonify(provinsi_list)

@app.route("/get_kota/<provinsi>", methods=["GET"])
def get_kota(provinsi):
    kota_list = list(kota_collection.find({"nama_provinsi": provinsi}, {"_id": 0, "nama_kota": 1, "id": 1}))
    return jsonify(kota_list)

@app.route("/get_ongkir", methods=["POST"])
def get_ongkir():
    data = request.json
    origin = data.get("origin")
    destination = data.get("destination")
    weight = max(data.get("weight", 1000), 1000)
    url = "https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost"
    # Read API key from environment for security
    api_key = os.getenv("RAJAONGKIR_KEY")
    if not api_key:
        # Return a helpful error so developer knows to set the environment variable
        return jsonify({"error": "RajaOngkir API key not configured. Set RAJAONGKIR_KEY in .env or environment."}), 500

    headers = {
        "key": api_key,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    payload = {
        "origin": origin,
        "destination": destination,
        "weight": weight,
        "courier": "jne:sicepat:ide:sap:jnt:ninja:tiki:lion:anteraja:pos:ncs:rex:rpx:sentral:star:wahana:dse",
        "price": "lowest"
    }

    response = requests.post(url, headers=headers, data=payload)
    print("RajaOngkir Response:", response.text)  
    return jsonify(response.json())


@app.route('/submit_checkout', methods=['POST'])
def submit_checkout():
    try:
        # Mendapatkan data yang dikirim dari klien
        data = request.get_json()
        nama = data.get('nama')
        alamat = data.get('alamat')
        kodepos = data.get('kodepos')
        whatsapp = data.get('whatsapp')
        pembayaran = data.get('pembayaran')
        produk = data.get('produk')  # Daftar produk dengan jumlah dan harga
        amount = data.get('amount')  # Total harga termasuk ongkir
        quantity = data.get('quantity')  # Total kuantitas
        timestamp = datetime.now()
        
        # Menambahkan status "Pending"
        status = "Pending"

        # Simpan data ke database
        db.orders.insert_one({
            'nama': nama,
            'alamat': alamat,
            'kodepos': kodepos,
            'whatsapp': whatsapp,
            'pembayaran': pembayaran,
            'produk': produk,
            'amount': amount,
            'quantity': quantity,
            'tanggal': timestamp,
            'status': status  # Menambahkan status "Pending"
        })
        
        # Hapus semua item dari keranjang setelah checkout berhasil
        db.cart.delete_many({})

        return jsonify({"message": "Order berhasil disimpan!"})
    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({"message": "Terjadi kesalahan saat menyimpan order."}), 500
                
@app.route("/invoice")
def invoice():
    try:
        orders = list(db.orders.find())
        total_orders = len(orders)
        total_invoice = sum(order.get('amount', 0) for order in orders)
        return render_template(
            "invoice.html", 
            orders=orders, 
            total_invoice=total_invoice, 
            total_orders=total_orders
        )
    except Exception as e:
        print(f"Error fetching invoices: {e}")
        return "Error loading invoices."

@app.route("/get_invoice_details/<invoice_id>")
def get_invoice_details(invoice_id):
    try:
        object_id = ObjectId(invoice_id)
        order = db.orders.find_one({"_id": object_id})
        if order:
            products = order.get('produk', [])
            if not products:
                return jsonify({"message": "Data produk tidak ditemukan"}), 400
            product_details = [
                {
                    "title": product.get('title', 'No title'),
                    "quantity": product.get('quantity', 0),
                    "price": product.get('price', 0)
                }
                for product in products
            ]
            return jsonify({
                "details": product_details,
                "status": order.get('status', 'Unknown'),
                "date": order.get('tanggal'),
                "customer": order.get('nama')
            })
        else:
            return jsonify({"message": "Order not found"}), 404
    except Exception as e:
        print(f"Error fetching invoice details: {e}")
        return jsonify({"message": "Error fetching invoice details"}), 500
            
# Route Admin

@app.route('/admin_home')
def admin_home():
    if session.get('role') != 'admin':  # Cek apakah user adalah admin
        return redirect(url_for('homepage'))
    
    reviews = db.reviews.find()  # Ambil semua data review dari database
    return render_template('home-admin.html', reviews=reviews, logged_in=session.get('logged_in', False))

# Halaman Admin - Produk
@app.route('/admin/products', methods=['GET', 'POST'])
def admin_products():
    if request.method == 'POST':  # Menambah produk
        title = request.form.get('title')
        description = request.form.get('description')
        price = request.form.get('price')
        image = request.files.get('image')  # Ambil file gambar

        # Validasi input
        if not title or not description or not price or not image or not allowed_file(image.filename):
            return render_template('product-admin.html', error="Semua field harus diisi dengan gambar yang valid.", products=db.products.find())

        # Simpan gambar
        filename = secure_filename(image.filename)
        image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        # Simpan produk ke database
        product = {
            "title": title,
            "description": description,
            "image_url": os.path.join('static/uploads', filename).replace("\\","/"),
            "price": parse_price_to_int(price)
        }
        db.products.insert_one(product)

        return redirect(url_for('admin_products'))

    # Menampilkan produk
    products = db.products.find()
    return render_template('product-admin.html', products=products)


@app.route('/admin/products/update/<product_id>', methods=['GET', 'POST'])
def update_product(product_id):
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        price = request.form.get('price')
        image = request.files.get('image')

        if not title or not description or not price:
            return redirect(url_for('admin_products', error="Semua field harus diisi!"))

        # Data update produk
        update_data = {
            "title": title,
            "description": description,
            "price": parse_price_to_int(price)
        }

        if image and allowed_file(image.filename):
            filename = secure_filename(image.filename)
            image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            update_data["image_url"] = os.path.join('static/uploads', filename)

        db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_data}
        )

        return redirect(url_for('admin_products'))

    product = db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        return "Produk tidak ditemukan", 404

    return render_template('edit.html', product=product)

@app.route('/admin/products/delete/<product_id>', methods=['POST'])
def delete_product(product_id):
    db.products.delete_one({"_id": ObjectId(product_id)})
    return redirect(url_for('admin_products'))

@app.route('/admin/history')
def admin_history():
    try:
        # Fetch orders data from the database
        orders = list(db.orders.find())  # Fetching all orders
        return render_template('history.html', orders=orders)
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return jsonify({"message": "Error fetching orders"}), 500

@app.route('/update_order_status', methods=['POST'])
def update_order_status():
    try:
        data = request.get_json()  # Ambil data dari request body
        invoice_id = data.get('invoice_id')  # Ambil invoice_id
        new_status = data.get('status')  # Ambil status baru

        # Validasi input
        if not invoice_id or not new_status:
            return jsonify({"message": "Invoice ID and status are required."}), 400

        if not ObjectId.is_valid(invoice_id):
            return jsonify({"message": "Invalid invoice_id."}), 400

        # Konversi invoice_id ke ObjectId
        invoice_id = ObjectId(invoice_id)

        # Update status di database
        result = db.orders.update_one(
            {"_id": invoice_id},  # Cari berdasarkan invoice_id
            {"$set": {"status": new_status}}  # Update status
        )

        if result.modified_count > 0:
            print(f"Status successfully updated to {new_status}.")
            return jsonify({"message": f"Status updated to {new_status}."}), 200
        else:
            return jsonify({"message": "No changes made. The status might already be the same."}), 400

    except Exception as e:
        print(f"Error updating order status: {e}")
        return jsonify({"message": "Error updating order status"}), 500
                        
@app.route('/get_top_products')
def get_top_products():
    try:
        # Ambil hanya orders dengan status 'Paid' atau 'Completed'
        pipeline = [
            {"$match": {"status": {"$in": ["Paid", "Completed"]}}},  # Filter status
            {"$unwind": "$produk"},  # Melepas array produk menjadi satuan item
            {"$group": {
                "_id": "$produk.title",  # Mengelompokkan berdasarkan nama produk
                "quantity_sold": {"$sum": "$produk.quantity"}  # Menjumlahkan quantity
            }},
            {"$sort": {"quantity_sold": -1}}  # Urutkan dari terbanyak
        ]
        top_products = list(db.orders.aggregate(pipeline))
        return jsonify(top_products)
    except Exception as e:
        print(f"Error fetching top products: {e}")
        return jsonify({"message": "Error fetching top products"}), 500

@app.route('/get_total_income')
def get_total_income():
    try:
        # Ambil hanya orders dengan status 'Paid' atau 'Completed'
        pipeline = [
            {"$match": {"status": {"$in": ["Paid", "Completed"]}}},
            {"$group": {"_id": {"$month": "$tanggal"}, "total_income": {"$sum": "$amount"}}},
            {"$sort": {"_id": 1}}
        ]
        total_income = list(db.orders.aggregate(pipeline))
        return jsonify(total_income)
    except Exception as e:
        print(f"Error fetching total income: {e}")
        return jsonify({"message": "Error fetching total income"}), 500

def update_income_and_top_products():
    # Function to update total income and top products on order status update
    pass


@app.route('/change_password', methods=['POST'])
def change_password():
    if not session.get('logged_in') or not session.get('user_id'):
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    user_id = session.get('user_id')
    data = request.get_json() or {}
    current = data.get('current_password')
    new = data.get('new_password')

    if not current or not new:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400

    # basic new password validation
    if len(new) < 6:
        return jsonify({'success': False, 'message': 'Password harus minimal 6 karakter'}), 400

    try:
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'success': False, 'message': 'User tidak ditemukan'}), 404

        # verify current password
        if not bcrypt.check_password_hash(user['password'], current):
            return jsonify({'success': False, 'message': 'Password saat ini salah'}), 400

        # update password
        hashed = bcrypt.generate_password_hash(new).decode('utf-8')
        db.users.update_one({'_id': ObjectId(user_id)}, {'$set': {'password': hashed}})
        return jsonify({'success': True, 'message': 'Password berhasil diubah'})
    except Exception as e:
        print(f"Error changing password: {e}")
        return jsonify({'success': False, 'message': 'Terjadi kesalahan'}), 500

# Route Logout
@app.route('/logout')
def logout():
    # Clear server-side session and redirect to homepage so user lands
    # on the public home page in a logged-out state. Add a query flag
    # the frontend can use for any additional client-side cleanup.
    session.clear()
    return redirect(url_for('homepage', logged_out=1))


# Route Profile - lihat dan update (hanya name dan phone/no_telp)
@app.route('/profile', methods=['GET', 'POST'])
def profile():
    # Pastikan user sudah login
    if not session.get('logged_in') or not session.get('user_id'):
        return redirect(url_for('login'))

    user_id = session.get('user_id')
    try:
        user = db.users.find_one({'_id': ObjectId(user_id)})
    except Exception:
        user = None

    if request.method == 'POST':
        # support both normal form post and AJAX multipart/form-data
        name = request.form.get('name', '').strip()
        phone = request.form.get('phone', '').strip()

        if not name:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': False, 'message': 'Nama tidak boleh kosong'}), 400
            return render_template('profile.html', user=user, error='Nama tidak boleh kosong')
            
        # Handle avatar upload
        update_data = {
            'name': name,
            'phone': phone
        }

        try:
            # Update user data in database
            result = db.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                # Get updated user data
                updated_user = db.users.find_one({'_id': ObjectId(user_id)})
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({
                        'success': True,
                        'message': 'Profil berhasil diperbarui'
                    })
                return render_template('profile.html', user=updated_user, message='Profil berhasil diperbarui')
            else:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({
                        'success': False,
                        'message': 'Tidak ada perubahan yang disimpan'
                    }), 400
                return render_template('profile.html', user=user, error='Tidak ada perubahan yang disimpan')
                
        except Exception as e:
            print(f"Error updating profile: {e}")
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    'success': False,
                    'message': 'Terjadi kesalahan saat menyimpan profil'
                }), 500
            return render_template('profile.html', user=user, error='Terjadi kesalahan saat menyimpan profil')
        if 'avatar' in request.files:
            file = request.files['avatar']
            if file.filename:
                avatar_path = save_avatar(file)

        # Update user data
        try:
            # Update user data in database
            result = db.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                # Refresh user data
                user = db.users.find_one({'_id': ObjectId(user_id)})
                return render_template('profile.html', user=user, message='Profile berhasil diperbarui')
            else:
                return render_template('profile.html', user=user, error='Tidak ada perubahan yang disimpan')
                
        except Exception as e:
            print(f"Error updating profile: {e}")
            return render_template('profile.html', user=user, error='Terjadi kesalahan saat menyimpan profil')

        update_data = {'name': name}

        # validate phone if provided
        if phone:
            if not _valid_phone(phone):
                msg = 'Format nomor telepon tidak valid'
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({'success': False, 'message': msg}), 400
                return render_template('profile.html', user=user, error=msg)
            update_data['phone'] = phone

        # handle avatar upload
        avatar = request.files.get('avatar')
        if avatar and allowed_file(avatar.filename):
            try:
                filename = secure_filename(avatar.filename)
                # make filename unique
                unique_name = f"{uuid.uuid4().hex}_{filename}"
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
                avatar.save(save_path)
                # store relative path
                update_data['avatar_url'] = os.path.join('static/uploads', unique_name).replace('\\', '/')
            except Exception as e:
                print(f"Error saving avatar: {e}")

        try:
            db.users.update_one({'_id': ObjectId(user_id)}, {'$set': update_data})
            session['nama'] = name
            user = db.users.find_one({'_id': ObjectId(user_id)})
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': True, 'message': 'Profil berhasil diperbarui'})
            return render_template('profile.html', user=user, message='Profil berhasil diperbarui')
        except Exception as e:
            print(f"Error updating profile: {e}")
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': False, 'message': 'Gagal memperbarui profil'}), 500
            return render_template('profile.html', user=user, error='Gagal memperbarui profil')

    # GET: tampilkan data user
    return render_template('profile.html', user=user)

# Route untuk membuat akun admin pertama jika belum ada
@app.route('/create_first_admin', methods=['GET'])
def create_first_admin():
    if not db.users.find_one({'role': 'admin'}):
        hashed_password = bcrypt.generate_password_hash('admin_password').decode('utf-8')
        db.users.insert_one({
            'name': 'Admin',
            'email': 'admin@admin.com',
            'password': hashed_password,
            'role': 'admin'
        })
        return "Admin pertama berhasil dibuat!"
    return "Admin sudah ada!"

if __name__ == '__main__':
    # On Windows, the reloader can spawn additional threads/sockets that
    # sometimes cause OSError: [WinError 10038] in managed terminals.
    # Disable the automatic reloader when running from this environment.
    app.run(debug=True, use_reloader=False)
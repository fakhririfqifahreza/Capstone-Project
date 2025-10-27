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
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not email or not password:
            return render_template('login.html', error="Email dan password harus diisi")
        
        # Cari user berdasarkan email
        user = db.users.find_one({'email': email})
        
        if not user or not bcrypt.check_password_hash(user['password'], password):
            return render_template('login.html', error="Email atau password salah")

        
        # Simpan informasi login ke sesi
        session['logged_in'] = True
        session['user_id'] = str(user['_id'])
        session['role'] = user['role']
        session['nama'] = user['name']
        
        # Redirect berdasarkan role user
        if user['role'] == 'admin':
            return jsonify({
                'success': True,
                'redirect_url': url_for('admin_home'),
                'message': f"Selamat Datang {user['name']}!"
            })
        else:
            return jsonify({
                'success': True,
                'redirect_url': url_for('homepage'),
                'message': f"Selamat Datang {user['name']}!"
            })
    
    return render_template('login.html')

# Route untuk halaman register
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        role = request.form.get('role')
        
        # Validasi data
        if not name or not email or not password or not confirm_password:
            return render_template('register.html', error="Semua field harus diisi")
        
        if password != confirm_password:
            return render_template('register.html', error="Password tidak cocok")
        
        # Cek jika email sudah terdaftar
        if db.users.find_one({'email': email}):
            return render_template('register.html', error="Email sudah digunakan")
        
        # Hash password dan simpan ke database
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = {
            'name': name,
            'email': email,
            'password': hashed_password,
            'role': role if role else 'customer'  # Default role 'customer'
        }
        # Hash password dan simpan ke database
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = {
        'name': name,
        'email': email,
        'password': hashed_password,
        'role': role if role else 'customer'  # Default role 'customer'
        }
        db.users.insert_one(user)  # <-- simpan user lengkap

        return redirect(url_for('login'))  # Redirect ke halaman login setelah registrasi berhasil
    return render_template('register.html')

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
    if not session.get("logged_in"):
        return redirect(url_for("login"))
    products = db.products.find()
    return render_template("product.html", products=products)

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

# Route Logout
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

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
    app.run(debug=True)
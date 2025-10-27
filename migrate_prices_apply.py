#!/usr/bin/env python3
"""
Safe migration helper for normalizing price fields in MongoDB to integer rupiah.

Usage:
  - Preview mode (no writes):
      python migrate_prices_apply.py --preview

  - Apply mode (writes + backups):
      python migrate_prices_apply.py --apply

The script will:
  - Connect using MONGODB_URI and DB_NAME from .env (falls back to defaults)
  - Find candidate documents in `products`, `cart`, and `orders` (nested `produk` entries)
  - In preview mode: print counts and sample documents (before/after conversion)
  - In apply mode: create backup collections and update documents in-place

Make a DB backup externally before running in production. Run first with --preview.
"""
import os
import argparse
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
import re
import copy

# Load .env if present
load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'batik_db')

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

# Reuse the same parsing logic as the app to ensure consistent conversion
def parse_price_to_int(value):
    if value is None:
        return 0
    if isinstance(value, int):
        return int(value)
    if isinstance(value, float):
        return int(round(value))
    s = str(value)
    s = re.sub(r"[^0-9.,-]", "", s).strip()
    if not s:
        return 0
    try:
        if '.' in s and ',' in s:
            s = s.replace('.', '').replace(',', '.')
        elif '.' in s and ',' not in s:
            s = s.replace('.', '')
        elif ',' in s and '.' not in s:
            s = s.replace(',', '.')
        num = float(s)
        return int(round(num))
    except Exception:
        try:
            return int(float(s.replace(',', '.')))
        except Exception:
            return 0


def find_candidates():
    products = list(db.products.find())
    cart = list(db.cart.find())
    orders = list(db.orders.find())

    prod_cand = [p for p in products if not isinstance(p.get('price', None), int)]
    cart_cand = [c for c in cart if not isinstance(c.get('price', None), int)]

    orders_cand = []
    for o in orders:
        updated = False
        produk = o.get('produk') or []
        for it in produk:
            if not isinstance(it.get('price', None), int):
                updated = True
                break
        if updated:
            orders_cand.append(o)

    return prod_cand, cart_cand, orders_cand


def preview_print_samples(prod_cand, cart_cand, orders_cand, limit=5):
    def show_docs(title, docs):
        print('\n--- {}: {} candidate(s) ---'.format(title, len(docs)))
        for d in docs[:limit]:
            before = copy.deepcopy(d)
            # compute after
            if title == 'products':
                after = copy.deepcopy(d)
                after['price'] = parse_price_to_int(after.get('price'))
            elif title == 'cart':
                after = copy.deepcopy(d)
                after['price'] = parse_price_to_int(after.get('price'))
            elif title == 'orders':
                after = copy.deepcopy(d)
                new_produk = []
                for it in after.get('produk', []):
                    it2 = copy.deepcopy(it)
                    it2['price'] = parse_price_to_int(it2.get('price'))
                    new_produk.append(it2)
                after['produk'] = new_produk
            else:
                after = before
            print('\n_id:', d.get('_id'))
            print(' before:', {k: before.get(k) for k in ("price","produk") if k in before})
            print(' after :', {k: after.get(k) for k in ("price","produk") if k in after})

    show_docs('products', prod_cand)
    show_docs('cart', cart_cand)
    show_docs('orders', orders_cand)


def backup_collection(coll_name):
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f"{coll_name}_backup_{timestamp}"
    print(f"Creating backup collection: {backup_name} ...")
    src = db[coll_name]
    dst = db[backup_name]
    # copy docs in batches
    count = 0
    for doc in src.find():
        dst.insert_one(doc)
        count += 1
    print(f"Backed up {count} documents to {backup_name}")
    return backup_name


def apply_updates(prod_cand, cart_cand, orders_cand):
    # Backups
    print('\nBacking up affected collections...')
    prod_backup = backup_collection('products')
    cart_backup = backup_collection('cart')
    orders_backup = backup_collection('orders')

    # Update products
    print('\nUpdating products...')
    prod_updated = 0
    for p in prod_cand:
        new_price = parse_price_to_int(p.get('price'))
        res = db.products.update_one({'_id': p['_id']}, {'$set': {'price': new_price}})
        prod_updated += res.modified_count
    print(f"Products updated: {prod_updated}")

    # Update cart
    print('\nUpdating cart...')
    cart_updated = 0
    for c in cart_cand:
        new_price = parse_price_to_int(c.get('price'))
        new_qty = int(c.get('quantity') or 1)
        res = db.cart.update_one({'_id': c['_id']}, {'$set': {'price': new_price, 'quantity': new_qty}})
        cart_updated += res.modified_count
    print(f"Cart items updated: {cart_updated}")

    # Update orders (nested produk list)
    print('\nUpdating orders...')
    orders_updated = 0
    for o in orders_cand:
        produk = o.get('produk', [])
        new_produk = []
        changed = False
        for it in produk:
            it2 = dict(it)
            old_price = it2.get('price')
            new_price = parse_price_to_int(old_price)
            if new_price != old_price:
                changed = True
                it2['price'] = new_price
            new_produk.append(it2)
        if changed:
            res = db.orders.update_one({'_id': o['_id']}, {'$set': {'produk': new_produk}})
            orders_updated += res.modified_count
    print(f"Orders updated: {orders_updated}")

    print('\nMigration apply complete.')
    print(f"Backups: products->{prod_backup}, cart->{cart_backup}, orders->{orders_backup}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Preview/apply price normalization migration')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--preview', action='store_true', help='Preview candidate documents (no writes)')
    group.add_argument('--apply', action='store_true', help='Apply migration (creates backups and updates documents)')
    args = parser.parse_args()

    prod_cand, cart_cand, orders_cand = find_candidates()

    if args.preview:
        print('Preview mode: no changes will be made.')
        preview_print_samples(prod_cand, cart_cand, orders_cand)
        print('\nSummary:')
        print(f" products: {len(prod_cand)} candidates")
        print(f" cart    : {len(cart_cand)} candidates")
        print(f" orders  : {len(orders_cand)} candidates")
        print('\nIf the preview looks correct, run with --apply to make changes (a backup will be created).')
    elif args.apply:
        print('Apply mode: backups will be created and updates applied.')
        # safety prompt
        confirm = input('Type YES to proceed with apply: ')
        if confirm.strip() != 'YES':
            print('Aborted by user.')
        else:
            apply_updates(prod_cand, cart_cand, orders_cand)

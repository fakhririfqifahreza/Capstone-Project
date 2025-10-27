from pymongo import MongoClient
from bson.objectid import ObjectId
import os

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "batik_db")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

def candidates(coll_name):
    col = db[coll_name]
    # temukan dokumen yang price bukan number (string or missing)
    docs = col.find({"$or": [{"price": {"$type": "string"}}, {"price": {"$exists": False}}]})
    return list(docs)

if __name__ == "__main__":
    for coll in ["cart", "products", "orders"]:
        docs = candidates(coll)
        print(f"Collection {coll}: {len(docs)} candidate(s) with non-numeric price")
        for d in docs[:20]:
            print(d)
        print("-" * 40)
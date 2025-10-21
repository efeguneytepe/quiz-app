import pymongo
from pymongo import MongoClient
import pandas as pd
import sys
import os
from dotenv import load_dotenv
import sys # sys zaten varsa tekrar ekleme

# .env dosyasını yükle (bu script ile aynı klasörde olmalı)
load_dotenv() 

# MONGODB_URI değişkenini ortamdan oku
CONNECTION_STRING = os.getenv("MONGODB_URI")

# Eğer .env dosyasında MONGODB_URI bulunamazsa hata ver ve çık
if not CONNECTION_STRING:
    print("HATA: .env dosyasında MONGODB_URI bulunamadı veya dosya yüklenemedi.")
    sys.exit(1)
# --- BU BİLGİLERİ KONTROL ET ---
CONNECTION_STRING = "mongodb+srv://efe:efeali99@cluster0.32a1qcm.mongodb.net/quiz-app?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "quiz-app"
COLLECTION_NAME = "students"
CSV_OUTPUT_FILE = "public/quiz_sonuclari.csv"
# ---------------------------------

try:
    # 1. MongoDB'ye bağlan
    client = MongoClient(CONNECTION_STRING)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    print(f"Bağlantı başarılı! '{db.name}' veritabanındaki '{collection.name}' koleksiyonuna bağlanıldı.")

    # 2. Veritabanındaki TÜM kayıtları çek ve bir listeye koy
    print("Kayıtlar çekiliyor...")
    cursor = collection.find()
    all_students_list = list(cursor)
    
    if not all_students_list:
        print("Veritabanında hiç kayıt bulunamadı.")
        sys.exit()

    print(f"Toplam {len(all_students_list)} adet öğrenci kaydı bulundu.")

    # 3. Pandas ile veriyi "düzleştirme"
    df = pd.json_normalize(all_students_list)

    # 4. Veriyi CSV dosyasına kaydet
    df.to_csv(CSV_OUTPUT_FILE, index=False, encoding='utf-8-sig')

    print("-" * 30)
    print(f"BAŞARILI: Tüm veriler '{CSV_OUTPUT_FILE}' dosyasına kaydedildi.")

except pymongo.errors.ConnectionFailure as e:
    print(f"MongoDB bağlantı hatası: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Genel bir hata oluştu: {e}")
finally:
    # 5. Bağlantıyı kapat
    if 'client' in locals() and client:
        client.close()
        print("Bağlantı kapatıldı.")

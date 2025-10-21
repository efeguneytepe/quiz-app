import pymongo
from pymongo import MongoClient
import random
import datetime
import sys

# --- Ayarlar (Burayı kontrol et) ---
CONNECTION_STRING = "mongodb+srv://efe:efeali99@cluster0.32a1qcm.mongodb.net/quiz-app?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "quiz-app"
COLLECTION_NAME = "students"

# True yaparsan, bu script çalışmadan önce eski kayıtların (200 segmentli öğrenci) tamamını siler.
CLEAR_OLD_DATA = True

NUM_STUDENTS_TO_ADD = 200
DOGRU_CEVAP_IHTIMALI = 0.40 # %40 ihtimalle doğru (ortalama 20*0.4 = 8 doğru)
# ---------------------------------

# Sahte veri için listeler
FIRST_NAMES = [
    'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Veli', 'İbrahim', 'Yusuf', 'Murat', 'Kemal',
    'Ayşe', 'Fatma', 'Zeynep', 'Emine', 'Hatice', 'Elif', 'Merve', 'Sultan', 'Yasemin', 'Rabia'
]
LAST_NAMES = [
    'Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Şahin', 'Yıldız', 'Arslan', 'Doğan', 'Koç', 'Kurt'
]

# Rastgele tarih oluşturmak için yardımcı fonksiyon
def generate_random_date(start, end):
    return start + datetime.timedelta(
        seconds=random.randint(0, int((end - start).total_seconds()))
    )

print(f"{NUM_STUDENTS_TO_ADD} adet RASTGELE öğrenci verisi oluşturuluyor...")

all_students_to_insert = []
start_date = datetime.datetime(2025, 9, 21) # Son 1 ay
end_date = datetime.datetime.now()

# 1. 200 öğrenci için döngü başlat
for _ in range(NUM_STUDENTS_TO_ADD):
    
    questionScores = {}
    totalScore = 0
    
    # 2. Her öğrenci için 20 soruyu rastgele puanla
    for i in range(20): # id_0'dan id_19'a kadar
        
        # --- YENİ RASTGELE MANTIK ---
        # 40% ihtimalle doğru (1), 60% ihtimalle yanlış (0)
        yanlis_ihtimali = 1.0 - DOGRU_CEVAP_IHTIMALI
        answer = random.choices([0, 1], weights=[yanlis_ihtimali, DOGRU_CEVAP_IHTIMALI], k=1)[0]
        # --- MANTIK BİTTİ ---
        
        questionScores[f'id_{i}'] = answer
        
        if answer == 1:
            totalScore += 1

    # Öğrenci dokümanını hazırla
    student_doc = {
        'name': f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        'totalScore': totalScore,
        'totalQuestions': 20,
        'quizDate': generate_random_date(start_date, end_date),
        'questionScores': questionScores,
    }
    all_students_to_insert.append(student_doc)

print("Veriler oluşturuldu. Veritabanına bağlanılıyor...")

# --- MongoDB'ye Toplu Ekleme ---
try:
    client = MongoClient(CONNECTION_STRING)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # 1. İsteğe bağlı: Eski verileri temizle
    if CLEAR_OLD_DATA:
        print("CLEAR_OLD_DATA = True. Eski kayıtlar siliniyor...")
        delete_result = collection.delete_many({}) # Tüm kayıtları siler
        print(f"{delete_result.deleted_count} adet eski kayıt silindi.")

    print("Bağlantı başarılı. Yeni veriler yükleniyor...")
    
    # 2. 200 yeni öğrenciyi tek seferde veritabanına ekle
    result = collection.insert_many(all_students_to_insert)
    
    print("-" * 30)
    print(f"BAŞARILI: {len(result.inserted_ids)} adet yeni kayıt veritabanına eklendi.")

except pymongo.errors.ConnectionFailure as e:
    print(f"MongoDB bağlantı hatası (Atlas IP İzinlerini Kontrol Et!): {e}")
    sys.exit(1)
except Exception as e:
    print(f"Genel bir hata oluştu: {e}")
finally:
    if 'client' in locals() and client:
        client.close()
        print("Bağlantı kapatıldı.")

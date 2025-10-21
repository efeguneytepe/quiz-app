import pymongo
from pymongo import MongoClient
import random
import datetime
import sys

# --- Ayarlar (Burayı kontrol et) ---
CONNECTION_STRING = "mongodb+srv://efe:efeali99@cluster0.32a1qcm.mongodb.net/quiz-app?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "quiz-app"
COLLECTION_NAME = "students"

# --- YENİ AYARLAR ---
# True yaparsan, bu script çalışmadan önce eski kayıtların (Veli, Efe, 200 sahte) tamamını siler.
CLEAR_OLD_DATA = True

NUM_STUDENTS_PER_SEGMENT = 50

# Kural: 4 segment, her segment 5 soruyu doğru biliyor
# range(0, 5) -> 0, 1, 2, 3, 4
segments_correct_indices = [
    range(0, 5),   # Grup 1: Sadece ilk 5 soruyu (id_0'dan id_4'e) doğru bilir
    range(5, 10),  # Grup 2: Sadece 6-10. soruları (id_5'ten id_9'a) doğru bilir
    range(10, 15), # Grup 3: Sadece 11-15. soruları (id_10'dan id_14'e) doğru bilir
    range(15, 20)  # Grup 4: Sadece son 5 soruyu (id_15'ten id_19'a) doğru bilir
]
# --- YENİ AYARLAR BİTTİ ---

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

print(f"{NUM_STUDENTS_PER_SEGMENT * len(segments_correct_indices)} adet yeni, segmentli öğrenci verisi oluşturuluyor...")

all_students_to_insert = []
start_date = datetime.datetime(2025, 9, 21) # Son 1 ay
end_date = datetime.datetime.now()

# 1. Ana Segment Döngüsü (Listede 4 segment olduğu için 4 kez dönecek)
for segment_range in segments_correct_indices:
    
    segment_name = f"Segment (Sorular {segment_range.start}-{segment_range.stop - 1})"
    print(f"{segment_name} için {NUM_STUDENTS_PER_SEGMENT} öğrenci oluşturuluyor...")
    
    # 2. Her segment için 50 öğrenci oluşturma döngüsü
    for _ in range(NUM_STUDENTS_PER_SEGMENT):
        
        questionScores = {}
        totalScore = 0
        
        # 3. Her öğrenci için 20 soruyu oluşturma döngüsü
        for i in range(20): # id_0'dan id_19'a kadar
            
            # --- YENİ MANTIK ---
            # Soru (i), bu öğrencinin uzmanlık alanında mı?
            if i in segment_range:
                answer = 1 # Evet, doğru bilsin
            else:
                answer = 0 # Hayır, geri kalan her şeyi yanlış bilsin
            # --- MANTIK BİTTİ ---
            
            questionScores[f'id_{i}'] = answer
            
            if answer == 1:
                totalScore += 1 # (Bu her zaman 5 olacak)

        # Öğrenci dokümanını hazırla
        student_doc = {
            'name': f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} - ({segment_name})",
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

import pymongo
import matplotlib.pyplot as plt
import numpy as np
import os
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# MongoDB Bağlantısı
# Eğer .env çalışmazsa buraya direkt linkini yapıştırabilirsin
CONNECTION_STRING = os.getenv("MONGODB_URI")
if not CONNECTION_STRING:
	print("HATA: MONGODB_URI BULUNAMADI!. ENV DOSYASINI KONTROL ET")
	sys.exit(1)

def generate_performance_chart():
    try:
        # 1. Veritabanına Bağlan
        client = pymongo.MongoClient(CONNECTION_STRING)
        db = client['quiz-app']
        collection = db['students']
        
        # 2. En Son Sınava Giren Öğrenciyi Bul
        # sort([('_id', -1)]) -> En son eklenen kaydı getirir
        student = collection.find_one(sort=[('_id', -1)])
        
        if not student:
            print("❌ Hiç öğrenci kaydı bulunamadı! Önce sınavı çözün.")
            return

        print(f"📊 Analiz Edilen Öğrenci: {student.get('name')} ({student.get('totalScore')} Puan)")
        
        # 3. Veriyi Ayrıştır (typeAnalysis yoksa hata vermesin)
        analysis = student.get('typeAnalysis', {})
        
        if not analysis:
            print("⚠️ Bu öğrenci için detaylı konu analizi bulunamadı (Eski kayıt olabilir).")
            return

        # Kategoriler ve Puanlar
        categories = []
        corrects = []
        wrongs = []
        
        # Sıralamanın düzgün olması için sabit liste üzerinden gidelim
        topic_order = ["Toplama", "Çıkarma", "Çarpma", "Bölme", "Denklem"]
        
        for topic in topic_order:
            stats = analysis.get(topic)
            if stats:
                categories.append(topic)
                correct_count = stats['correct']
                total_count = stats['total']
                wrong_count = total_count - correct_count
                
                corrects.append(correct_count)
                wrongs.append(wrong_count)
            else:
                # Eğer o konudan soru gelmediyse 0 yazalım
                categories.append(topic)
                corrects.append(0)
                wrongs.append(0)

        # 4. Grafiği Çiz (Matplotlib)
        x = np.arange(len(categories))  # Etiketlerin konumları
        width = 0.35  # Çubuk genişliği

        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Çubukları oluştur (Yeşil: Doğru, Kırmızı: Yanlış)
        rects1 = ax.bar(x - width/2, corrects, width, label='Doğru', color='#4CAF50')
        rects2 = ax.bar(x + width/2, wrongs, width, label='Yanlış/Boş', color='#F44336')

        # Etiketler, Başlık ve Eksenler
        ax.set_ylabel('Soru Sayısı')
        ax.set_title(f'{student.get("name")} - Konu Bazlı Performans Analizi')
        ax.set_xticks(x)
        ax.set_xticklabels(categories)
        ax.legend()

        # Çubukların üzerine sayıları yaz (Fonksiyon)
        def autolabel(rects):
            for rect in rects:
                height = rect.get_height()
                if height > 0: # 0 ise yazma
                    ax.annotate('{}'.format(height),
                                xy=(rect.get_x() + rect.get_width() / 2, height),
                                xytext=(0, 3),  # 3 points vertical offset
                                textcoords="offset points",
                                ha='center', va='bottom', fontweight='bold')

        autolabel(rects1)
        autolabel(rects2)

        # Grafiği sıkıştır ve göster
        fig.tight_layout()
        
        # İstersen kaydet
        plt.savefig('sonuc_grafigi.png')
        print("✅ Grafik 'sonuc_grafigi.png' olarak kaydedildi.")
        
        # Ekrana aç
        plt.show()

    except Exception as e:
        print(f"Hata oluştu: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    generate_performance_chart()

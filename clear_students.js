const mongoose = require('mongoose');
const Student = require('./models/Student'); // Student modelinin yolu
require('dotenv').config();

const clearStudents = async () => {
    try {
        // Veritabanına Bağlan
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Bağlandı: ${conn.connection.host}`);
        
        // Tüm öğrencileri sil (deleteMany parantez içi boşsa hepsini siler)
        const result = await Student.deleteMany({});
        
        console.log(`✅ Temizlik tamamlandı! Toplam ${result.deletedCount} öğrenci kaydı silindi.`);
        
        // İşlem bitince çık
        process.exit();
    } catch (error) {
        console.error('Hata oluştu:', error);
        process.exit(1);
    }
};

clearStudents();
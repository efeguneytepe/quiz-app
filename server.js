const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Student = require('./models/Student');

const app = express();
const PORT = process.env.PORT || 3000;
require('dotenv').config({ 
    path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' 
});
// Veritabanına bağlan
connectDB();
mongoose.connection.on('error', (err) => {
    console.error('MongoDB bağlantı hatası:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB bağlantısı kesildi');
});
// Middleware'ler
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Route'ları
app.post('/api/save-quiz-result', async (req, res) => {
    try {
        console.log('Gelen İstek Body:', req.body); // Gelen veriyi logla

        const { 
            name, 
            totalScore, 
            totalQuestions, 
            questionScores 
        } = req.body;

        // Detaylı veri doğrulama
        if (!name) {
            return res.status(400).json({ message: 'Öğrenci adı zorunludur' });
        }

        // totalScore için kontrol
        if (totalScore === undefined || totalScore === null) {
            return res.status(400).json({ message: 'Puan bilgisi zorunludur' });
        }

        // Yeni öğrenci kaydı oluştur
        const newStudent = new Student({
            name,
            totalScore, 
            totalQuestions,
            questionScores
        });

        // Veritabanına kaydet
        const savedStudent = await newStudent.save();

        console.log('Kaydedilen Öğrenci:', savedStudent);

        res.status(201).json({
            message: 'Öğrenci quiz sonucu başarıyla kaydedildi',
            student: savedStudent
        });
    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({ 
            message: 'Öğrenci kaydı sırasında bir hata oluştu', 
            error: error.message 
        });
    }
});
// Tüm kayıtları görüntüleme
app.get('/api/all-students', async (req, res) => {
    try {
        const students = await Student.find().sort({ totalScore: -1 });
        res.json(students);
    } catch (error) {
        res.status(500).json({ 
            message: 'Öğrenciler getirilemedi', 
            error: error.message 
        });
    }
});
app.get('/api/quiz-results', async (req, res) => {
    try {
        const results = await Student.find()
            .sort({ score: -1 })
            .limit(10);

        res.status(200).json(results);
    } catch (error) {
        console.error('Sonuçları getirme hatası:', error);
        res.status(500).json({ 
            message: 'Sonuçlar getirilemedi', 
            error: error.message 
        });
    }
});
// Tüm öğrencileri getiren endpoint
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        console.log('📊 Tüm Öğrenciler Endpoint:', students);
        res.json(students);
    } catch (error) {
        console.error('❌ Öğrencileri getirme hatası:', error);
        res.status(500).json({ message: 'Öğrenciler getirilemedi' });
    }
});
// Güvenlik log modeli oluşturun
const SecurityLogSchema = new mongoose.Schema({
    userId: {
        type: String, // Benzersiz kullanıcı tanımlayıcısı
        required: true
    },
    eventType: {
        type: String,
        enum: ['RIGHT_CLICK', 'COPY_ATTEMPT', 'SCREENSHOT', 'DEV_TOOLS'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    additionalInfo: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
});

const SecurityLog = mongoose.model('SecurityLog', SecurityLogSchema);

// Güvenlik log kayıt endpoint'i
app.post('/api/security-log', async (req, res) => {
    try {
        const { 
            eventType, 
            userId, 
            additionalInfo 
        } = req.body;

        // IP adresini ve kullanıcı aracısını al
        const ipAddress = req.ip;
        const userAgent = req.get('User-Agent');

        // Yeni güvenlik log kaydı oluştur
        const newSecurityLog = new SecurityLog({
            userId,
            eventType,
            ipAddress,
            userAgent,
            additionalInfo
        });

        // Kaydet
        await newSecurityLog.save();

        res.status(201).json({ 
            message: 'Güvenlik log kaydedildi',
            logId: newSecurityLog._id 
        });
    } catch (error) {
        console.error('Güvenlik log kayıt hatası:', error);
        res.status(500).json({ 
            message: 'Log kaydedilemedi', 
            error: error.message 
        });
    }
});
// Tüm diğer istekler için index.html'i gönder
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu başlatma
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
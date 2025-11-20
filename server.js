const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Student = require('./models/Student');
const Question = require('./models/Question')

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
app.get('/api/questions', async (req, res) => {
    try {
        // .select('-correctAnswer') diyerek doğru cevabın gitmesini engelliyoruz
        let questions = await Question.find().select('-correctAnswer').lean();
	questions.sort(() => Math.random() - 0.5);
	res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Sorular yüklenemedi' });
    }
});

// 2. SINAVI PUANLA VE KAYDET (Server-Side Grading)
// server.js içinde '/api/submit-quiz' rotasını BUL ve BUNUNLA DEĞİŞTİR:

app.post('/api/submit-quiz', async (req, res) => {
    try {
        const { name, answers } = req.body;

        // Soruları cevap anahtarıyla çek
        // questionType alanını da aldığımıza emin olalım
        const allQuestions = await Question.find().select('+correctAnswer +questionType');
        
        let totalScore = 0;
        const questionScores = {}; 
        
        // Analiz Objesi (Konu Bazlı)
        const typeStats = {}; 

        // Tip İsimleri Haritası (Kodları isme çevirelim ki DB'de okuması kolay olsun)
        const typeNames = {
            1: "Toplama",
            2: "Çıkarma",
            3: "Çarpma",
            4: "Bölme",
            5: "Denklem"
        };

        // Puanlama Döngüsü
        allQuestions.forEach(q => {
            const qId = q._id.toString();
            const qType = q.questionType || 0; // Tip yoksa 0
            const typeName = typeNames[qType] || "Diğer"; // İsim karşılığı

            // Eğer bu konu analiz objesinde yoksa başlat
            if (!typeStats[typeName]) {
                typeStats[typeName] = { correct: 0, total: 0, successRate: "0%" };
            }

            // O konunun toplam soru sayısını artır
            typeStats[typeName].total += 1;

            // Cevabı kontrol et
            const userAnswerObj = answers.find(a => a.questionId === qId);
            const userAnswer = userAnswerObj ? userAnswerObj.selectedOption : null;
            const isCorrect = (userAnswer === q.correctAnswer);

            if (isCorrect) {
                totalScore++;
                questionScores[qId] = 1;
                
                // O konunun doğru sayısını artır
                typeStats[typeName].correct += 1;
            } else {
                questionScores[qId] = 0;
            }
        });

        // Başarı Yüzdelerini Hesapla
        // (Örn: Toplama'da 4 soruda 3 doğru yaptıysa %75 yazar)
        for (const key in typeStats) {
            const stat = typeStats[key];
            const percent = Math.round((stat.correct / stat.total) * 100);
            stat.successRate = `%${percent}`;
        }

        // Öğrenciyi Kaydet
        const newStudent = new Student({
            name,
            totalScore,
            totalQuestions: allQuestions.length,
            questionScores,
            typeAnalysis: typeStats // <-- Yeni alan buraya gidiyor
        });

        await newStudent.save();

        res.json({ 
            success: true, 
            score: totalScore, 
            total: allQuestions.length,
		analysis: typeStats
        });

    } catch (error) {
        console.error("Quiz gönderme hatası:", error);
        res.status(500).json({ message: 'Hesaplama hatası' });
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

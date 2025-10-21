// Quiz başlangıcında
const quizState = {
    started: false,
    completed: false,
    currentIndex: 0,
    score: 0,
    studentName: '',
    savedTime: null,
    userAnswers: [] 
};

function startQuiz() {
    const name = studentNameInput.value.trim();
    
    if (!name) {
        alert('Lütfen adınızı giriniz');
        return;
    }

    // Quiz durumunu sıfırla
    quizState.started = true;
    quizState.completed = false;
    quizState.currentIndex = 0;
    quizState.score = 0;
    quizState.studentName = name;

    // Ekran geçişi
    nameScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    // Global değişkenleri güncelle
    selectedAnswer = '';

    // İlk soruyu yükle
    loadQuestion();
}
// Sayfa yüklendiğinde devam eden quiz kontrolü
window.addEventListener('load', () => {
    const savedQuiz = localStorage.getItem('quizInProgress');
    
    if (savedQuiz) {
        const quizData = JSON.parse(savedQuiz);
        const currentTime = new Date().getTime();
        
        // 30 dakikadan eski ise silme
        if (currentTime - quizData.savedTime > 30 * 60 * 1000) {
            localStorage.removeItem('quizInProgress');
            return;
        }
        if (quizData.currentIndex >= quizQuestions.length) {
            localStorage.removeItem('quizInProgress');
            return;
        }

        // quizState'yi güncelle
        quizState.studentName = quizData.studentName;
        quizState.currentIndex = quizData.currentIndex;
        quizState.score = quizData.score;
        quizState.userAnswers = quizData.userAnswers || [];
        
        // Ekran geçişi
        nameScreen.classList.add('hidden');
        quizScreen.classList.remove('hidden');
        
        // Kaldığınız soruyu yükle
        loadQuestion();
    }
});


(function() {
    // Ekran görüntüsü engelleyici
    function preventScreenshot(message = 'İçerik kopyalanamaz!') {
        // Overlay oluştur
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        overlay.style.color = 'white';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.fontSize = '24px';
        overlay.style.textAlign = 'center';
        overlay.innerHTML = `
            <div style="background: black; padding: 30px; border-radius: 10px; max-width: 500px;">
                <h2>İçerik Koruması</h2>
                <p>${message}</p>
                <small style="font-size: 16px; margin-top: 20px; display: block;">
                    Bu içerik telif hakları ile korunmaktadır.
                </small>
            </div>
        `;
        
        // Overlay'ı ekle
        document.body.appendChild(overlay);
        
        // 5 saniye sonra kaldır
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 5000);
    }

    // Windows Shift S ve ekran görüntüsü alma girişimlerini izle
    document.addEventListener('keydown', (e) => {
        const screenshotShortcuts = [
            (e.key === 's' && e.shiftKey && e.metaKey), // MacOS
            (e.key === 's' && e.shiftKey && e.getModifierState('OS')), // Windows
            (e.key === 'PrintScreen'),
            (e.ctrlKey && e.key === 'p')
        ];
        
        if (screenshotShortcuts.some(Boolean)) {
            e.preventDefault();
            preventScreenshot('Ekran görüntüsü alma izni verilmemiştir!');
        }
    });

    // Fare seçimi engellemesi
    document.addEventListener('mouseup', (e) => {
        if (window.getSelection().toString().length > 0) {
            preventScreenshot('Metin seçimi ve kopyalama engellenmiştir!');
        }
    });

    // Ek koruma katmanları
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.addEventListener('copy', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
})();
function logSecurityEvent(eventType, additionalInfo = {}) {
    // Benzersiz kullanıcı ID'si oluştur (örneğin oturum bazlı)
    const userId = quizState.studentName || 'anonymous';

    fetch('/api/security-log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            eventType,
            userId,
            additionalInfo
        })
    })
    .then(response => {
        console.log('Güvenlik log gönderildi:', eventType);
    })
    .catch(error => {
        console.error('Güvenlik log gönderme hatası:', error);
    });
}

// Mevcut engelleme kodlarına log ekleme
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    console.log('Sağ tık engellendi');
    logSecurityEvent('RIGHT_CLICK', {
        message: 'Sağ tık girişimi engellendi'
    });
});

document.addEventListener('copy', (e) => {
    e.preventDefault();
    console.log('Kopyalama engellendi');
    logSecurityEvent('COPY_ATTEMPT', {
        message: 'İçerik kopyalama girişimi engellendi'
    });
});

document.addEventListener('keydown', (e) => {
    const screenshotShortcuts = [
        (e.key === 's' && e.shiftKey && e.metaKey),
        (e.key === 's' && e.shiftKey && e.getModifierState('OS')),
        (e.key === 'PrintScreen'),
        (e.ctrlKey && e.key === 'p')
    ];
    
    if (screenshotShortcuts.some(Boolean)) {
        e.preventDefault();
        logSecurityEvent('SCREENSHOT', {
            message: 'Ekran görüntüsü alma girişimi engellendi',
            key: e.key,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey
        });
    }
});

// Geliştirici araçları için
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.shiftKey && e.key === 'J')) {
        e.preventDefault();
        logSecurityEvent('DEV_TOOLS', {
            message: 'Geliştirici araçları açılma girişimi engellendi',
            key: e.key,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey
        });
    }
});
// Quiz Soruları
const quizQuestions = [
    {
        id: 1,
        question: "Türkiye'nin başkenti neresidir?",
        options: ["İstanbul", "Ankara", "İzmir", "Antalya"],
        correctAnswer: "Ankara"
    },
    {
        id: 2,
        question: "En büyük Türk devleti hangisidir?",
        options: ["Selçuklu", "Osmanlı", "Cumhuriyet", "Göktürk"],
        correctAnswer: "Osmanlı"
    },
    {
        id: 3,
        question: "Atatürk'ün doğum yılı kaçtır?",
        options: ["1881", "1890", "1875", "1899"],
        correctAnswer: "1881"
    },
    {
        id: 4,
        question: "Türkiye'nin en uzun nehri hangisidir?",
        options: ["Kızılırmak", "Fırat", "Dicle", "Sakarya"],
        correctAnswer: "Kızılırmak"
    },
    {
        id: 5,
        question: "Hangi renk Türk bayrağının renginde bulunur?",
        options: ["Yeşil", "Mor", "Kırmızı", "Turuncu"],
        correctAnswer: "Kırmızı"
    },
    {
        id: 6,
        question: "Türkiye'nin kaç ili vardır?",
        options: ["80", "81", "82", "79"],
        correctAnswer: "81"
    },
    {
        id: 7,
        question: "Hangisi İstanbul'un bir semtidir?",
        options: ["Çankaya", "Kadıköy", "Keçiören", "Mamak"],
        correctAnswer: "Kadıköy"
    },
    {
        id: 8,
        question: "Türk edebiyatının önemli yazarlarından biri kimdir?",
        options: ["Orhan Pamuk", "Zülfü Livaneli", "Yaşar Kemal", "Haldun Taner"],
        correctAnswer: "Orhan Pamuk"
    },
    {
        id: 9,
        question: "Hangisi Türkiye'nin komşu ülkelerinden biri değildir?",
        options: ["Suriye", "İran", "Irak", "Almanya"],
        correctAnswer: "Almanya"
    },
    {
        id: 10,
        question: "Türkiye'nin para birimi nedir?",
        options: ["Dolar", "Euro", "Türk Lirası", "Sterlin"],
        correctAnswer: "Türk Lirası"
    },
    {
        id: 11,
        question: "Hangisi Türkiye'nin en büyük gölüdür?",
        options: ["Van Gölü", "Tuz Gölü", "Beyşehir Gölü", "İznik Gölü"],
        correctAnswer: "Van Gölü"
    },
    {
        id: 12,
        question: "Türkiye Cumhuriyeti'nin kurucusu kimdir?",
        options: ["İsmet İnönü", "Mustafa Kemal Atatürk", "Adnan Menderes", "Süleyman Demirel"],
        correctAnswer: "Mustafa Kemal Atatürk"
    },
    {
        id: 13,
        question: "Hangisi Türkiye'nin en yüksek dağıdır?",
        options: ["Uludağ", "Erciyes", "Ağrı Dağı", "Kaçkar"],
        correctAnswer: "Ağrı Dağı"
    },
    {
        id: 14,
        question: "Türkiye'nin en çok nüfusa sahip şehri hangisidir?",
        options: ["Ankara", "İzmir", "İstanbul", "Bursa"],
        correctAnswer: "İstanbul"
    },
    {
        id: 15,
        question: "Hangisi Türk mutfağının meşhur tatlılarından biridir?",
        options: ["Tiramisu", "Baklava", "Cheesecake", "Crème Brûlée"],
        correctAnswer: "Baklava"
    },
    {
        id: 16,
        question: "Türkiye'nin kaç yılında Cumhuriyet ilan edildi?",
        options: ["1923", "1920", "1925", "1930"],
        correctAnswer: "1923"
    },
    {
        id: 17,
        question: "Hangisi Türkiye'nin en önemli turizm bölgelerinden biridir?",
        options: ["Kapadokya", "Çorum", "Kırşehir", "Niğde"],
        correctAnswer: "Kapadokya"
    },
    {
        id: 18,
        question: "Türkiye'nin resmi dili nedir?",
        options: ["Kürtçe", "Arapça", "Türkçe", "Farsça"],
        correctAnswer: "Türkçe"
    },
    {
        id: 19,
        question: "Hangisi Türk sporunda dünyaca ünlü bir futbolcudur?",
        options: ["Hamit Altıntop", "Hakan Şükür", "Arda Turan", "Emre Belözoğlu"],
        correctAnswer: "Hakan Şükür"
    },
    {
        id: 20,
        question: "Türkiye'nin en uzun kıyı şeridine sahip olan denizi hangisidir?",
        options: ["Akdeniz", "Karadeniz", "Ege Denizi", "Marmara Denizi"],
        correctAnswer: "Karadeniz"
    }
];

// DOM Elementleri
const nameScreen = document.getElementById('name-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const studentNameInput = document.getElementById('student-name');
const startQuizButton = document.getElementById('start-quiz');
const questionHeader = document.getElementById('question-header');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const nextQuestionButton = document.getElementById('next-question');
const resultText = document.getElementById('result-text');
const scoreText = document.getElementById('score-text');
const restartQuizButton = document.getElementById('restart-quiz');

// Uygulama Durumu
let selectedAnswer = '';
console.log('Quiz Script Yüklendi'); // En üste
// Quiz ayarları
const QUESTION_TIME_LIMIT = 60; // Her soru için 60 saniye (1 dakika)
let questionTimer; // Soru zamanlayıcısı
let remainingTime; // Kalan süre

function startQuestionTimer() {
    // Zamanlayıcı zaten varsa önce onu temizle
    if (questionTimer) {
        clearInterval(questionTimer);
    }

    // Kalan süreyi başlat
    remainingTime = QUESTION_TIME_LIMIT;
    
    // Zamanlayıcı göstergesi için HTML'e eleman ekle
    let timerDisplay = document.getElementById('timer-display');
    
    // Eğer zamanlayıcı elementi yoksa oluştur
    if (!timerDisplay) {
        timerDisplay = document.createElement('div');
        timerDisplay.id = 'timer-display';
        timerDisplay.style.position = 'fixed';
        timerDisplay.style.top = '10px';
        timerDisplay.style.right = '10px';
        timerDisplay.style.padding = '10px';
        timerDisplay.style.backgroundColor = 'red';
        timerDisplay.style.color = 'white';
        timerDisplay.style.fontWeight = 'bold';
        timerDisplay.style.zIndex = '1000';
        timerDisplay.style.borderRadius = '5px';
        document.body.appendChild(timerDisplay);
    }

    // Zamanlayıcıyı başlat
    questionTimer = setInterval(() => {
        if (timerDisplay) {
            timerDisplay.textContent = `Kalan Süre: ${remainingTime} saniye`;
        }

        remainingTime--;

        // Süre bittiğinde ve cevap seçilmediyse
        if (remainingTime < 0) {
            stopQuestionTimer();
            if (!selectedAnswer) { 
                alert('Süre doldu! Bu soru yanlış sayılacak.');
            }
            nextQuestionButton.click();
        }
    }, 1000);
}

function stopQuestionTimer() {
    // Zamanlayıcıyı durdur
    if (questionTimer) {
        clearInterval(questionTimer);
        questionTimer = null;
    }
    
    // Zamanlayıcı görüntüsünü kaldır
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
        timerEl.remove();
    }
}

// Soru yükleme fonksiyonunu güncelle
function loadQuestion() {
    // Önceki zamanlayıcıyı durdur
    stopQuestionTimer();
    
    const currentQuestion = quizQuestions[quizState.currentIndex];
    
    // Soru başlığını güncelle
    questionHeader.textContent = `Soru ${quizState.currentIndex + 1}/20 - Merhaba, ${quizState.studentName}`;
    
    // Soru metnini güncelle
    questionText.textContent = currentQuestion.question;
    
    // Seçenekleri temizle ve yükle
    optionsContainer.innerHTML = '';
    currentQuestion.options.forEach(option => {
        const optionButton = document.createElement('button');
        optionButton.textContent = option;
        optionButton.classList.add(
            'p-2', 'rounded', 'border', 
            'bg-gray-100', 'hover:bg-gray-200'
        );
        
        optionButton.addEventListener('click', () => {
            // Önceki seçili butonu temizle
            optionsContainer.querySelectorAll('button').forEach(btn => 
                btn.classList.remove('bg-blue-500', 'text-white')
            );
            
            // Yeni seçili butonu işaretle
            optionButton.classList.add('bg-blue-500', 'text-white');
            selectedAnswer = option;
            
            // Sonraki soru butonunu aktifleştir
            nextQuestionButton.disabled = false;
            nextQuestionButton.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            nextQuestionButton.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600');
            nextQuestionButton.classList.add('bg-green-500', 'text-white', 'active:bg-green-600');
        });
        
        optionsContainer.appendChild(optionButton);
    });
    
    // Yeni soru için zamanlayıcıyı başlat
    startQuestionTimer();
}
// Quiz Başlatma
startQuizButton.addEventListener('click', startQuiz);
// Sonraki Soru
nextQuestionButton.addEventListener('click', () => {
    // Zamanlayıcıyı durdur
    stopQuestionTimer();

    // Doğru cevabı kontrol et
    if (selectedAnswer === quizQuestions[quizState.currentIndex].correctAnswer) {
        quizState.score++;
    }
    quizState.userAnswers.push(selectedAnswer || "Süre Doldu");
    // Sonraki soruya geç
    quizState.currentIndex++;
    
    localStorage.setItem('quizInProgress', JSON.stringify({
        currentIndex: quizState.currentIndex,
        score: quizState.score,
       studentName: quizState.studentName,
        savedTime: new Date().getTime(),
        userAnswers: quizState.userAnswers
    }));
    
    if (quizState.currentIndex < quizQuestions.length) {
        loadQuestion();
        
        // Sonraki soru butonunu devre dışı bırak
        nextQuestionButton.disabled = true;
        nextQuestionButton.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
        nextQuestionButton.classList.remove('bg-green-500', 'text-white', 'hover:bg-green-600');
        nextQuestionButton.classList.remove('bg-green-500', 'text-white', 'active:bg-green-600');
        // Seçili cevabı temizle
        selectedAnswer = '';
    } else {
        // Quiz tamamlandı
        quizScreen.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        
        // Sonuçları göster
        resultText.textContent = `Sayın ${quizState.studentName}, quizden ${quizState.score} doğru...`;
        scoreText.textContent = `Puanınız: %${((quizState.score / quizQuestions.length) * 100).toFixed(0)}`;
        
        // Log ve kayıt fonksiyonunu ekleyelim
        saveQuizResult();
        localStorage.removeItem('quizInProgress');
    }
});

function saveQuizResult() {
    console.log("saveQuizResult fonksiyonu çağrıldı");

    const questionScores = {}; // Boş obje oluştur

    // Soru dizisi (quizQuestions) üzerinde dön
    quizQuestions.forEach((question, index) => {

        const userAnswer = quizState.userAnswers[index]; 
        const isCorrect = (question.correctAnswer === userAnswer);
        questionScores[`id_${index}`] = isCorrect ? 1 : 0;
    });

    // Gönderilecek veriyi hazırla
    const postData = {
        name: quizState.studentName, 
        totalScore: quizState.score,
        
        totalQuestions: quizQuestions.length,
        
        questionScores: questionScores
    };

    console.log('📤 Gönderilecek Veri:', postData);

    fetch('/api/save-quiz-result', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Sunucudan Gelen Yanıt:', data);
        alert('Quiz sonucunuz başarıyla kaydedildi!');
    })
    .catch(error => {
        console.error('❌ Fetch Hatası:', error);
        alert('Quiz sonucu kaydedilemedi. Lütfen tekrar deneyin.');
    });
}
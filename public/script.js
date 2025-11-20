// script.js - FINAL DÜZELTİLMİŞ VERSİYON

// --- GÜVENLİK ÖNLEMLERİ ---
document.addEventListener('contextmenu', event => event.preventDefault()); // Sağ tık engelle
document.addEventListener('copy', event => event.preventDefault());        // Kopyalama engelle
document.addEventListener('cut', event => event.preventDefault());         // Kesme engelle
document.addEventListener('paste', event => event.preventDefault());       // Yapıştırma engelle
document.addEventListener('keydown', event => {
    // F12 ve Geliştirici Araçlarını Engelle
    if (event.key === 'F12' || 
        (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'J')) || 
        (event.ctrlKey && event.key === 'U')) {
        event.preventDefault();
    }
});

// Global Değişkenler
const quizState = {
    started: false,
    completed: false,
    currentIndex: 0,
    score: 0,
    studentName: '',
    savedTime: null,
    userAnswers: [] 
};

let dbQuestions = []; 
let selectedAnswer = '';
let questionTimer;
let remainingTime;
const QUESTION_TIME_LIMIT = 60;

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

// 1. SORULARI ÇEK
async function fetchQuestions() {
    try {
        startQuizButton.textContent = "Yükleniyor...";
        startQuizButton.disabled = true; // Yüklenirken basamasın
        
        const res = await fetch('/api/questions');
        if (!res.ok) throw new Error('Sunucu hatası');
        
        dbQuestions = await res.json();
        console.log(`Toplam ${dbQuestions.length} soru yüklendi.`);
        
        startQuizButton.disabled = false;
        startQuizButton.textContent = "Quize Başla";
    } catch (err) {
        console.error("Sorular yüklenemedi:", err);
        startQuizButton.textContent = "Hata! Yenile";
        alert("Sorular yüklenirken hata oluştu. Lütfen sayfayı yenileyin.");
    }
}

// Sayfa açılınca çalıştır
fetchQuestions();

// 2. BAŞLAT (Düzeltilen Kısım Burası)
function startQuiz() {
    const name = studentNameInput.value.trim();
    
    if (!name) {
        alert('Lütfen adınızı giriniz');
        return;
    }

    // Eğer sorular hala gelmediyse veya boşsa uyar
    if (!dbQuestions || dbQuestions.length === 0) {
        alert("Sorular henüz yüklenemedi. Lütfen internet bağlantınızı kontrol edip sayfayı yenileyin.");
        return;
    }

    // Tam ekran yap (Opsiyonel)
    try {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } catch(e) {}

    quizState.started = true;
    quizState.studentName = name;
    quizState.currentIndex = 0;
    quizState.score = 0;

    nameScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    loadQuestion();
}

// 3. SORU YÜKLE
function loadQuestion() {
    stopQuestionTimer();
    
    const currentQuestion = dbQuestions[quizState.currentIndex];
    if (!currentQuestion) return;

    // Progress Bar Güncelleme (Eğer HTML'e eklediysen)
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        const progress = ((quizState.currentIndex + 1) / dbQuestions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    questionHeader.textContent = `Soru ${quizState.currentIndex + 1}/${dbQuestions.length}`;
    
    // Soru Metni
    questionText.innerHTML = ''; 
    try {
        katex.render(currentQuestion.questionText, questionText, {
            throwOnError: false,
            displayMode: true
        });
    } catch (e) {
        questionText.textContent = currentQuestion.questionText;
    }
    
    // Seçenekler
    optionsContainer.innerHTML = '';
    currentQuestion.options.forEach(option => {
        const optionButton = document.createElement('button');
        
        // ORTAK STİLLER (Hem seçili hem seçisizken geçerli olanlar)
        // text-2xl, font-medium, p-6, min-h-[80px] -> Bunlar hep sabit kalacak
        const baseStyle = "w-full p-6 mb-4 rounded-xl border-2 flex items-center justify-center text-2xl font-medium min-h-[80px] transition-all duration-200";
        
        // SEÇİLMEMİŞ HALİ (Normal)
        const unselectedStyle = `${baseStyle} border-transparent bg-white text-gray-700 shadow-md hover:shadow-lg hover:scale-[1.02] hover:border-blue-300`;
        
        // SEÇİLMİŞ HALİ (Aktif)
        const selectedStyle = `${baseStyle} border-blue-500 bg-blue-600 text-white shadow-inner scale-[1.02] ring-4 ring-blue-200`;

        // İlk başta seçilmemiş stilini ver
        optionButton.className = unselectedStyle;
        
        const mathSpan = document.createElement('span');
        // Tıklamayı engellemesin diye pointer-events-none ekleyebiliriz ama gerek yok
        try {
            katex.render(option, mathSpan, { throwOnError: false });
        } catch (e) {
            mathSpan.textContent = option;
        }
        optionButton.appendChild(mathSpan);
        
        optionButton.addEventListener('click', () => {
            // 1. Önce tüm butonları "Seçilmemiş" haline döndür
            optionsContainer.querySelectorAll('button').forEach(btn => {
                btn.className = unselectedStyle; 
            });
            
            // 2. Tıklanan butona "Seçilmiş" stilini ver
            optionButton.className = selectedStyle;
            
            selectedAnswer = option;
            
            nextQuestionButton.disabled = false;
            nextQuestionButton.classList.remove('bg-gray-300', 'cursor-not-allowed');
            nextQuestionButton.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600');
        });
        
        optionsContainer.appendChild(optionButton);
    });
    
    startQuestionTimer();
}

//Zamanlayıcıııı
function startQuestionTimer() {
    if (questionTimer) clearInterval(questionTimer);
    remainingTime = QUESTION_TIME_LIMIT;
    
    let timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) {
        timerDisplay = document.createElement('div');
        timerDisplay.id = 'timer-display';
        document.body.appendChild(timerDisplay);
    }
    
    timerDisplay.style.backgroundColor = 'red'; 
    timerDisplay.textContent = `Kalan: ${remainingTime} sn`;

    questionTimer = setInterval(() => {
        remainingTime--;
        timerDisplay.textContent = `Kalan: ${remainingTime} sn`;

        if (remainingTime < 0) {
            stopQuestionTimer();
            
            // --- DÜZELTME BURADA ---
            alert('Süre doldu! Diğer soruya geçiliyor.'); 
            
            // Önce butonun kilidini zorla açıyoruz ki tıklayabilelim
            nextQuestionButton.disabled = false; 
            nextQuestionButton.classList.remove('bg-gray-300', 'cursor-not-allowed');
            
            // Şimdi tıklatıyoruz
            nextQuestionButton.click(); 
        }
    }, 1000);
}
function stopQuestionTimer() {
    if (questionTimer) clearInterval(questionTimer);
}

// 5. SONRAKİ SORU BUTONU
nextQuestionButton.addEventListener('click', () => {
    stopQuestionTimer();
    
    // Cevabı kaydet
    quizState.userAnswers.push(selectedAnswer || null);
    
    // Sıfırla
    selectedAnswer = ''; 
    nextQuestionButton.disabled = true;
    nextQuestionButton.classList.add('bg-gray-300', 'cursor-not-allowed');
    nextQuestionButton.classList.remove('bg-green-500', 'text-white', 'hover:bg-green-600');

    quizState.currentIndex++;

    if (quizState.currentIndex < dbQuestions.length) {
        loadQuestion();
    } else {
        // Timer'ı gizle
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) timerDisplay.style.display = 'none';
        submitQuiz();
    }
});

// 6. GÖNDER
async function submitQuiz() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    resultText.textContent = "Sonuçlar ve Analiz yükleniyor...";
    scoreText.textContent = "Lütfen bekleyiniz...";
    
    const payload = {
        name: quizState.studentName,
        answers: dbQuestions.map((q, index) => ({
            questionId: q._id,
            selectedOption: quizState.userAnswers[index]
        }))
    };

    try {
        const res = await fetch('/api/submit-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        
        if (result.success) {
            resultText.innerHTML = `Tebrikler <b>${quizState.studentName}</b>, sınav tamamlandı.`;
            scoreText.innerHTML = `
                <div class="text-5xl font-bold text-blue-600 mb-2">${result.score} / ${result.total}</div>
                <div class="text-gray-500 text-sm">Toplam Puan</div>
            `;
            
            // --- KRİTİK NOKTA: Grafiği Çizdir ---
            if (result.analysis) {
                drawChart(result.analysis);
            }
            
            // Çıkış butonu (varsa silip tekrar ekleyelim ki çift olmasın)
            const oldBtn = document.getElementById('restart-btn');
            if(oldBtn) oldBtn.remove();

            const restartBtn = document.createElement('button');
            restartBtn.id = 'restart-btn';
            restartBtn.textContent = "Çıkış / Yeni Sınav";
            restartBtn.className = "mt-6 bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors w-full max-w-xs";
            restartBtn.onclick = () => location.reload();
            resultScreen.appendChild(restartBtn);

        } else {
            resultText.textContent = "Bir hata oluştu.";
        }
    } catch (err) {
        console.error(err);
        resultText.textContent = "Bağlantı Hatası!";
    }
}

// --- YENİ FONKSİYON: GRAFİK ÇİZEN MOTOR ---
function drawChart(analysisData) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    // Verileri hazırla
    const labels = Object.keys(analysisData); // ["Toplama", "Çıkarma", ...]
    const correctData = labels.map(key => analysisData[key].correct);
    const wrongData = labels.map(key => analysisData[key].total - analysisData[key].correct);

    // Varsa eski grafiği temizle (Tekrar oynanırsa üst üste binmesin)
    if (window.myQuizChart) {
        window.myQuizChart.destroy();
    }

    window.myQuizChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Doğru',
                    data: correctData,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)', // Yeşil
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Yanlış/Boş',
                    data: wrongData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)', // Kırmızı
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Konu Bazlı Başarı Analizi',
                    font: { size: 16 }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 } // Buçuklu sayı gösterme
                },
                x: {
                    stacked: true // Üst üste bindir (Stacked Bar) daha şık durur
                },
                y: {
                    stacked: true
                }
            }
        }
    });
}

// Başlat Butonu Dinleyicisi
startQuizButton.addEventListener('click', startQuiz);
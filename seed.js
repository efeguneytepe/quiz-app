const mongoose = require('mongoose');
const Question = require('./models/Question');
require('dotenv').config();

// --- GELİŞMİŞ KESİR MOTORU ---
class Fraction {
    constructor(n, d = 1) {
        if (d === 0) throw new Error("Payda sıfır olamaz");
        if (d < 0) { n = -n; d = -d; } 
        
        // Otomatik Sadeleştirme (2/8 -> 1/4)
        const common = this.gcd(Math.abs(n), Math.abs(d));
        this.n = n / common;
        this.d = d / common;
    }

    gcd(a, b) {
        return b ? this.gcd(b, a % b) : a;
    }

    add(other) { return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d); }
    subtract(other) { return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d); }
    multiply(other) { return new Fraction(this.n * other.n, this.d * other.d); }
    divide(other) { return new Fraction(this.n * other.d, this.d * other.n); }
    
    abs() { return new Fraction(Math.abs(this.n), this.d); }

    // LaTeX Çıktısı
    toLatex() {
        if (this.d === 1) return `${this.n}`; 
        if (this.n === 0) return "0";
        const sign = this.n < 0 ? "-" : "";
        return `${sign}\\frac{${Math.abs(this.n)}}{${this.d}}`;
    }
}

// --- YARDIMCI FONKSİYONLAR ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFraction = (allowNegative = true) => {
    let n = randomInt(-10, 10);
    if (!allowNegative) n = Math.abs(n);
    if (n === 0) n = 1; 
    const d = randomInt(2, 10);
    return new Fraction(n, d);
};

const generateOptions = (correctFrac) => {
    const optionsSet = new Set();
    optionsSet.add(correctFrac.toLatex()); 

    while (optionsSet.size < 4) {
        let wrongFrac;
        const method = randomInt(1, 4);
        try {
            if (method === 1) wrongFrac = new Fraction(correctFrac.d, correctFrac.n); 
            else if (method === 2) wrongFrac = new Fraction(-correctFrac.n, correctFrac.d); 
            else if (method === 3) wrongFrac = correctFrac.add(new Fraction(1, randomInt(2,5))); 
            else wrongFrac = correctFrac.subtract(new Fraction(1, randomInt(2,5))); 

            if (!isNaN(wrongFrac.n) && isFinite(wrongFrac.d)) {
                optionsSet.add(wrongFrac.toLatex());
            }
        } catch (e) {}
        if (optionsSet.size < 4) optionsSet.add(randomFraction().toLatex());
    }
    return Array.from(optionsSet).sort(() => Math.random() - 0.5);
};

// --- SORU TİPİ ÜRETİCİLERİ ---

// TİP 1: TOPLAMA
const generateAddition = (index) => {
    const f1 = randomFraction();
    const f2 = randomFraction();
    const result = f1.add(f2);
    
    let questionText;
    if (f2.n < 0) {
        questionText = `${f1.toLatex()} - ${f2.abs().toLatex()} \\text{ işleminin sonucu kaçtır?}`;
    } else {
        questionText = `${f1.toLatex()} + ${f2.toLatex()} \\text{ işleminin sonucu kaçtır?}`;
    }

    return { questionText, correctAnswer: result.toLatex(), options: generateOptions(result), questionType: 1, order: index };
};

// TİP 2: ÇIKARMA
const generateSubtraction = (index) => {
    const f1 = randomFraction();
    const f2 = randomFraction();
    const result = f1.subtract(f2);
    
    let questionText;
    if (f2.n < 0) {
        questionText = `${f1.toLatex()} - (${f2.toLatex()}) \\text{ işleminin sonucu kaçtır?}`;
    } else {
        questionText = `${f1.toLatex()} - ${f2.toLatex()} \\text{ işleminin sonucu kaçtır?}`;
    }

    return { questionText, correctAnswer: result.toLatex(), options: generateOptions(result), questionType: 2, order: index };
};

// TİP 3: ÇARPMA
const generateMultiplication = (index) => {
    const f1 = randomFraction();
    const f2 = randomFraction();
    const result = f1.multiply(f2);
    
    const t1 = f1.n < 0 ? `(${f1.toLatex()})` : f1.toLatex();
    const t2 = f2.n < 0 ? `(${f2.toLatex()})` : f2.toLatex();

    return { questionText: `${t1} \\cdot ${t2} \\text{ işleminin sonucu kaçtır?}`, correctAnswer: result.toLatex(), options: generateOptions(result), questionType: 3, order: index };
};

// TİP 4: BÖLME
const generateDivision = (index) => {
    const f1 = randomFraction();
    let f2 = randomFraction();
    while(f2.n === 0) f2 = randomFraction(); 
    
    const result = f1.divide(f2);
    const t1 = f1.n < 0 ? `(${f1.toLatex()})` : f1.toLatex();
    const t2 = f2.n < 0 ? `(${f2.toLatex()})` : f2.toLatex();

    return { questionText: `${t1} : ${t2} \\text{ işleminin sonucu kaçtır?}`, correctAnswer: result.toLatex(), options: generateOptions(result), questionType: 4, order: index };
};

// TİP 5: SEMBOLLÜ DENKLEMLER (1 Çarpanını Gizleyen Versiyon)
const generateEquation = (index) => {
    const symbolList = ["\\star", "\\blacksquare", "\\triangle", "\\heartsuit", "\\diamond"];
    const symbol = symbolList[randomInt(0, symbolList.length - 1)];
    
    const X = randomFraction(); 
    const A = new Fraction(randomInt(1, 5), 1); 
    const B = randomFraction(); 
    
    // C = A * X + B
    const C = A.multiply(X).add(B);
    
    // --- DÜZELTME BURADA: 1 Çarpanını Gizle ---
    let termString = "";
    
    if (A.n === 1 && A.d === 1) {
        // Eğer katsayı 1 ise sadece sembolü yaz (1 . X -> X)
        termString = symbol;
    } else if (A.n === -1 && A.d === 1) {
        // Eğer katsayı -1 ise eksi sembol yaz (-1 . X -> -X)
        termString = `-${symbol}`;
    } else {
        // Değilse normal yaz (2 . X)
        termString = `${A.toLatex()} \\cdot ${symbol}`;
    }
    
    let equationPart;
    if (B.n < 0) {
        equationPart = `${termString} - ${B.abs().toLatex()}`;
    } else {
        equationPart = `${termString} + ${B.toLatex()}`;
    }
    
    const questionText = `${equationPart} = ${C.toLatex()} \\text{ ise, } ${symbol} \\text{ kaçtır?}`;

    return {
        questionText,
        correctAnswer: X.toLatex(),
        options: generateOptions(X),
        questionType: 5,
        order: index
    };
};

// --- MAIN ---
const seedDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Bağlandı: ${conn.connection.host}`);

        await Question.deleteMany({});
        
        const questions = [];
        const TOTAL_QUESTIONS = 20;
        
        for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
            const type = ((i - 1) % 5) + 1;
            if (type === 1) questions.push(generateAddition(i));
            else if (type === 2) questions.push(generateSubtraction(i));
            else if (type === 3) questions.push(generateMultiplication(i));
            else if (type === 4) questions.push(generateDivision(i));
            else if (type === 5) questions.push(generateEquation(i));
        }

        await Question.insertMany(questions);
        console.log('✅ 20 Soru (1 çarpanı gizlenmiş halde) yüklendi!');
        
        process.exit();
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
};

seedDB();
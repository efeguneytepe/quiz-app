const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    totalScore: {
        type: Number,
        required: true, 
        min: 0 
    },
    totalQuestions: {
        type: Number,
        default: 20
    },
    quizDate: {
        type: Date,
        default: Date.now
    },
    questionScores: {
        type: Map,
        of: Number,
        default: {}
    },
    typeAnalysis: {
        type: Map,
        of: new mongoose.Schema({
            correct: Number,
            total: Number,
            successRate: String // "%75" gibi
        }, { _id: false }), // Alt şema için ID oluşturmasın
        default: {}
    }
}, { 
    collection: 'students' 
});

const Student = mongoose.model('Student', StudentSchema);

module.exports = Student;
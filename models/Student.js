const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    totalScore: {
        type: Number,
        required: true, // Zorunlu alan
        min: 0 // Minimum 0 olabilir
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
    }
}, { 
    collection: 'students' 
});

const Student = mongoose.model('Student', StudentSchema);

module.exports = Student;
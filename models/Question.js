// models/Question.js
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctAnswer: {
        type: String,
        required: true,
        select: false
    },
    order: {
        type: Number,
        default: 0
    },
    questionType: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Question', QuestionSchema);
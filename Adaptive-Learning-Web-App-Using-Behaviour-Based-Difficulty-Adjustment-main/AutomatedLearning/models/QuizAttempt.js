const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    questions: [
        {
            questionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Question"
            },
            questionText: String,
            options: [String],
            correctAnswer: Number
        }
    ],
    responses: [
        {
            questionId: mongoose.Schema.Types.ObjectId,
            selectedAnswer: Number,
            isCorrect: Boolean,
            timeTaken: Number,
            topic: String,          // ✅ ADD THIS
            difficulty: String      // (optional but good)
        }
    ],
    totalQuestions: Number,
    correctAnswers: Number,
    accuracy: Number,
    totalTime: Number,
    topic: {
        type: String,
        required: true
    },
    recommendation: {
        message: String,
        videos: [
            {
                title: String,
                url: String,
                thumbnail: String,
                topic: String
            }
        ]
    }
}, { timestamps: true });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
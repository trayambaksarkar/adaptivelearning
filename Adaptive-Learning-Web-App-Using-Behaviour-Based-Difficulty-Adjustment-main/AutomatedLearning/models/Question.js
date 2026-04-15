const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    subject: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium"
    },
    questionText: { type: String, required: true },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v.length === 4;
            },
            message: "A question must have exactly 4 options"
        }
    },
    correctAnswer: { type: Number, required: true, min: 0, max: 3 }

}, { timestamps: true });

/* Optimized Index for Admin Analytics */
questionSchema.index({ subject: 1, difficulty: 1 });

module.exports = mongoose.model("Question", questionSchema);
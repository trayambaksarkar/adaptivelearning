const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  selectedAnswer: { type: Number, required: true, min: 0, max: 3 },
  isCorrect: { type: Boolean, required: true },
  // Remove topic or make it optional
  topic: { type: String, required: false }, // optional now
  difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
  timeTaken: { type: Number, default: 0 },
  hintUsed: { type: Boolean, default: false },
  hint: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Response", responseSchema);
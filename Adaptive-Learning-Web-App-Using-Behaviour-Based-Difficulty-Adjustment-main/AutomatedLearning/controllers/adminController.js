const Question = require("../models/Question");
const User = require("../models/User");
const csv = require("csv-parser");
const fs = require("fs");
const multer = require("multer");

// ---------- MULTER CONFIG ----------
const upload = multer({ dest: "uploads/" });

// ---------- ADD SINGLE QUESTION ----------
exports.addQuestion = async (req, res) => {
  try {
    const { subject, topic, difficulty, questionText, options, correctAnswer, hint } = req.body;

    // 1️⃣ Check required fields
    if (!subject || !topic || !difficulty || !questionText || !options) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // 2️⃣ Check options array
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Options must be an array of 4 values"
      });
    }

    // 3️⃣ ✅ Check correctAnswer validity
    if (correctAnswer === undefined || correctAnswer < 0 || correctAnswer > 3) {
      return res.status(400).json({
        success: false,
        message: "Correct answer must be an index between 0 and 3"
      });
    }

    // 4️⃣ Create question
    const question = await Question.create({
      subject,
      topic,
      difficulty,
      questionText,
      options,
      correctAnswer,
      hint
    });

    res.status(201).json({
      success: true,
      question
    });

  } catch (error) {
    console.error("Add Question Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add question"
    });
  }
};

// ---------- CSV BULK UPLOAD ----------
exports.uploadCSV = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required"
      });
    }

    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())

      .on("data", (data) => {

        try {

          const parsedOptions = JSON.parse(data.options);

          results.push({
            subject: data.subject,
            topic: data.topic,
            difficulty: data.difficulty,
            questionText: data.questionText,
            options: parsedOptions,
            correctAnswer: Number(data.correctAnswer),
            hint: data.hint
          });

        } catch (err) {

          console.error("CSV row parse error:", err);

        }

      })

      .on("end", async () => {

        if (results.length === 0) {
          return res.status(400).json({
            success: false,
            message: "No valid questions found in CSV"
          });
        }

        await Question.insertMany(results);

        // Delete uploaded file after processing
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          inserted: results.length
        });

      });

  } catch (error) {

    console.error("CSV Upload Error:", error);

    res.status(500).json({
      success: false,
      message: "CSV upload failed"
    });

  }

};

// ---------- analytics ----------
exports.getAnalytics = async (req, res) => {
  try {

    const totalUsers = await User.countDocuments();
    const totalQuestionsInDB = await Question.countDocuments();

    // Aggregation for subject analytics
    const subjectStats = await Question.aggregate([
      {
        $group: {
          _id: "$subject",
          totalQuestions: { $sum: 1 },
          easy: {
            $sum: {
              $cond: [{ $eq: ["$difficulty", "easy"] }, 1, 0]
            }
          },
          medium: {
            $sum: {
              $cond: [{ $eq: ["$difficulty", "medium"] }, 1, 0]
            }
          },
          hard: {
            $sum: {
              $cond: [{ $eq: ["$difficulty", "hard"] }, 1, 0]
            }
          }
        }
      }
    ]);

    const subjects = subjectStats.map(s => ({
      subject: s._id,
      totalQuestions: s.totalQuestions,
      easy: s.easy,
      medium: s.medium,
      hard: s.hard
    }));

    res.json({
      success: true,
      totalUsers,
      totalQuestionsInDB,
      subjects
    });

  } catch (error) {

    console.error("Admin Analytics Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics"
    });

  }
};
const mongoose = require("mongoose");
const Question = require("../models/Question");
const Response = require("../models/Response");
const User = require("../models/User");
const mlService = require("../services/mlService");
const QuizAttempt = require("../models/QuizAttempt");
const { generateRecommendations } = require("../services/recommendationService");

/*   --- START QUIZ ---*/
exports.startQuiz = async (req, res) => {
  try {
    const { subject, topic } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({
        success: false,
        message: "Subject and Topic are required",
      });
    }

    const attemptedIdsRaw = await Response.find({
      user: req.user.id,
    }).distinct("question");

    const attemptedIds = attemptedIdsRaw
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    let questions = await Question.aggregate([
      {
        $match: {
          subject: { $regex: new RegExp(`^${subject}$`, "i") },
          topic: { $regex: new RegExp(`^${topic}$`, "i") },
          difficulty: { $regex: /^easy$/i },
          _id: { $nin: attemptedIds },
        },
      },
      { $sample: { size: 10 } },
    ]);

    if (questions.length === 0) {
      questions = await Question.aggregate([
        {
          $match: {
            subject: { $regex: new RegExp(`^${subject}$`, "i") },
            topic: { $regex: new RegExp(`^${topic}$`, "i") },
          },
        },
        { $sample: { size: 10 } },
      ]);
    }

    if (questions.length === 0) {
      questions = await Question.aggregate([
        {
          $match: {
            subject: { $regex: new RegExp(`^${subject}$`, "i") },
          },
        },
        { $sample: { size: 10 } },
      ]);
    }

    if (questions.length === 0) {
      questions = await Question.aggregate([{ $sample: { size: 10 } }]);
    }

    res.status(200).json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error("Start quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Error starting quiz",
    });
  }
};

/* =====================================================
   --- GET SUBJECTS ---
===================================================== */
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Question.distinct("subject");
    res.status(200).json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   --- GET TOPICS BY SUBJECT ---
===================================================== */
exports.getTopicsBySubject = async (req, res) => {
  try {
    const { subject } = req.query;

    if (!subject) {
      return res.json({
        success: false,
        message: "Subject is required",
      });
    }

    const topics = await Question.distinct("topic", {
      subject: { $regex: new RegExp(`^${subject}$`, "i") },
    });

    res.json({
      success: true,
      topics,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   --- SUBMIT ANSWER ---
===================================================== */
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, selectedAnswer, timeTaken, hintUsed } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const isCorrect =
      String(question.correctAnswer) === String(selectedAnswer);

    await Response.create({
      user: req.user.id,
      question: questionId,
      selectedAnswer,
      isCorrect,
      difficulty: question.difficulty,
      topic: question.topic,
      subject: question.subject,
      timeTaken,
      hintUsed: hintUsed ? 1 : 0,
    });

    // =====================================================
    // 🔥 ML PREDICTION
    // =====================================================
    const difficultyMap = { easy: 1, medium: 2, hard: 3 };

    const difficultyKey = question.difficulty
      ? question.difficulty.toLowerCase()
      : "medium";

    const mlPrediction = await mlService.getDifficultyPrediction({
      response_time: timeTaken,
      correctness: isCorrect ? 1 : 0,
      hint_used: hintUsed ? 1 : 0,
      current_difficulty: difficultyMap[difficultyKey] || 2,
    });
    console.log("🧠 ML MODEL USED:", mlPrediction.model_used);
    let nextDifficulty = mlPrediction.difficulty_level || "medium";

    // =====================================================
    // 🔥 REAL-TIME OVERRIDE
    // =====================================================
    if (isCorrect && timeTaken <= 5) {
      if (nextDifficulty === "easy") nextDifficulty = "medium";
      else if (nextDifficulty === "medium") nextDifficulty = "hard";
    }

    if (!isCorrect && timeTaken >= 10) {
      if (nextDifficulty === "hard") nextDifficulty = "medium";
      else if (nextDifficulty === "medium") nextDifficulty = "easy";
    }

    // =====================================================
    // 🔥 DKT KNOWLEDGE CONTROL (FINAL LAYER)
    // =====================================================
    const user = await User.findById(req.user.id);
    const knowledge = user.knowledge || 0.5;

    if (knowledge < 0.4) {
      nextDifficulty = "easy";
    } else if (knowledge > 0.75) {
      if (nextDifficulty === "easy") nextDifficulty = "medium";
      else if (nextDifficulty === "medium") nextDifficulty = "hard";
    }

    nextDifficulty = nextDifficulty.toLowerCase();

    console.log("FINAL DIFFICULTY:", nextDifficulty, "| KNOWLEDGE:", knowledge);

    // =====================================================
    // 🔥 FETCH NEXT QUESTION
    // =====================================================
    const attemptedRaw = await Response.find({
      user: req.user.id,
    }).distinct("question");

    const attemptedQuestions = attemptedRaw
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    let nextQuestion = await Question.aggregate([
      {
        $match: {
          difficulty: { $regex: new RegExp(`^${nextDifficulty}$`, "i") },
          subject: { $regex: new RegExp(`^${question.subject}$`, "i") },
          topic: { $regex: new RegExp(`^${question.topic}$`, "i") },
          _id: { $nin: attemptedQuestions },
        },
      },
      { $sample: { size: 1 } },
    ]);

    if (nextQuestion.length === 0) {
      nextQuestion = await Question.aggregate([
        {
          $match: {
            subject: { $regex: new RegExp(`^${question.subject}$`, "i") },
            topic: { $regex: new RegExp(`^${question.topic}$`, "i") },
            _id: { $nin: attemptedQuestions },
          },
        },
        { $sample: { size: 1 } },
      ]);
    }

    if (nextQuestion.length === 0) {
      nextQuestion = await Question.aggregate([
        {
          $match: {
            subject: { $regex: new RegExp(`^${question.subject}$`, "i") },
            _id: { $nin: attemptedQuestions },
          },
        },
        { $sample: { size: 1 } },
      ]);
    }

    if (nextQuestion.length === 0) {
      nextQuestion = await Question.aggregate([{ $sample: { size: 1 } }]);
    }

    res.status(200).json({
      success: true,
      isCorrect,
      mlPrediction,
      knowledge, // 🔥 useful for frontend if needed
      nextQuestion: nextQuestion[0] || null,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error submitting answer",
    });
  }
};

/* =====================================================
   --- FINISH QUIZ ---
===================================================== */
exports.finishQuiz = async (req, res) => {
  try {
    const { questionIds, subject, topic } = req.body;

    const responses = await Response.find({
      user: req.user.id,
      question: { $in: questionIds },
    })
      .sort({ createdAt: -1 })
      .populate("question");

    const latestMap = new Map();
    for (let r of responses) {
      if (!latestMap.has(String(r.question._id))) {
        latestMap.set(String(r.question._id), r);
      }
    }

    const filtered = questionIds
      .map((id) => latestMap.get(String(id)))
      .filter(Boolean);

    const totalQuestions = filtered.length;
    const correctAnswers = filtered.filter((r) => r.isCorrect).length;
    const totalTime = filtered.reduce(
      (sum, r) => sum + (r.timeTaken || 0),
      0
    );

    const accuracy = Number(
      ((correctAnswers / totalQuestions) * 100).toFixed(1)
    );

    // =====================================================
    // 🔥 BUILD HISTORY FOR DKT MODEL
    // =====================================================
    const historyData = await Response.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    const formattedHistory = historyData.map(r => [
      r.timeTaken || 0,
      r.isCorrect ? 1 : 0,
      r.hintUsed ? 1 : 0
    ]);

    const knowledgeData = await mlService.getKnowledgePrediction(formattedHistory);
    const knowledge = knowledgeData.knowledge;

    console.log("KNOWLEDGE:", knowledge);
    // =====================================================

    const quizData = {
      user: req.user.id,
      subject,
      topic,
      questions: filtered.map((r) => ({
        questionId: r.question._id,
        questionText: r.question.questionText,
        options: r.question.options,
        correctAnswer: r.question.correctAnswer,
        difficulty: r.question.difficulty,
        topic: r.question.topic,
      })),
      responses: filtered.map((r) => ({
        questionId: r.question._id,
        selectedAnswer: r.selectedAnswer,
        isCorrect: r.isCorrect,
        timeTaken: r.timeTaken,
        difficulty: r.difficulty,
        topic: r.topic,
      })),
      totalQuestions,
      correctAnswers,
      accuracy,
      totalTime,
    };

    // ✅ Recommendation with knowledge
    const recommendation = await generateRecommendations({
      accuracy,
      responses: quizData.responses || [],
      knowledge,
      subject
    });

    // ✅ Save quiz
    const savedQuiz = await QuizAttempt.create({
      ...quizData,
      recommendation
    });

    // =====================================================
    // 🔥 UPDATE USER (STREAK + KNOWLEDGE)
    // =====================================================
    const user = await User.findById(req.user.id);

    // 🔥 SAVE KNOWLEDGE
    user.knowledge = knowledge;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last = new Date(user.streak.lastActiveDate || 0);
    last.setHours(0, 0, 0, 0);

    const diff = (today - last) / (1000 * 60 * 60 * 24);

    if (diff === 1) user.streak.current += 1;
    else if (diff > 1) user.streak.current = 1;

    user.streak.longest = Math.max(
      user.streak.longest,
      user.streak.current
    );
    user.streak.lastActiveDate = today;

    let activity = user.activityDates.find(
      (a) => new Date(a.date).getTime() === today.getTime()
    );

    if (activity) activity.count += 1;
    else user.activityDates.push({ date: today, count: 1 });

    await user.save();

    // =====================================================

    res.json({
      success: true,
      quizId: savedQuiz._id,
      totalQuestions,
      correctAnswers,
      accuracy,
      totalTime,
      questions: quizData.questions,
      responses: quizData.responses,
      recommendation,
      knowledge // 🔥 FINAL OUTPUT
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   --- QUIZ HISTORY ---
===================================================== */
exports.getQuizHistory = async (req, res) => {
  try {
    const history = await QuizAttempt.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select(
        "subject topic totalQuestions correctAnswers accuracy createdAt"
      );

    res.json({ success: true, history });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   --- SINGLE QUIZ ---
===================================================== */
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await QuizAttempt.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    res.json({ success: true, quiz });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   --- RECOMMENDED TOPIC ---
===================================================== */
exports.recommendTopic = async (req, res) => {
  try {
    const { subject } = req.query;

    const matchStage = { user: req.user.id };
    if (subject) matchStage.subject = subject;

    const result = await Response.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$topic",
          total: { $sum: 1 },
          correct: {
            $sum: { $cond: ["$isCorrect", 1, 0] },
          },
        },
      },
      {
        $project: {
          topic: "$_id",
          accuracy: {
            $multiply: [{ $divide: ["$correct", "$total"] }, 100],
          },
        },
      },
      { $sort: { accuracy: 1 } },
      { $limit: 1 },
    ]);

    if (!result.length) {
      return res.json({ success: false });
    }

    res.json({
      success: true,
      recommendedTopic: result[0].topic,
      accuracy: result[0].accuracy.toFixed(2),
    });
  } catch {
    res.status(500).json({ success: false });
  }
};



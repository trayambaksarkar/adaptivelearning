const express = require("express");
const router = express.Router();
const { startQuiz, submitAnswer, finishQuiz,getSubjects, getQuizHistory,getQuizById,getTopicsBySubject,recommendTopic} = require("../controllers/quizController");
const { protect } = require("../middleware/authMiddleware");

router.get("/subjects", protect, getSubjects); 
router.get("/topics",protect,getTopicsBySubject);
router.get("/recommend-topic",protect,recommendTopic);
router.post("/start", protect, startQuiz);
router.post("/answer", protect, submitAnswer);
router.post("/finish", protect, finishQuiz);
router.get("/history", protect, getQuizHistory);
router.get("/:id", protect, getQuizById);

module.exports = router;
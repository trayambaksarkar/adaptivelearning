const express = require("express");
const router = express.Router();
const { getAnalytics, getStudentPerformance,saveResponse } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

router.get("/analytics", protect, getAnalytics);
router.get("/performance", protect, getStudentPerformance);
router.post("/response", protect, saveResponse);

module.exports = router;
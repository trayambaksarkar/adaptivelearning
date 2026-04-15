const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

router.post("/add-question", protect, adminMiddleware, adminController.addQuestion);
router.post("/upload-csv", protect, adminMiddleware, upload.single("file"), adminController.uploadCSV);
router.get("/analytics", protect, adminMiddleware, adminController.getAnalytics);

module.exports = router;
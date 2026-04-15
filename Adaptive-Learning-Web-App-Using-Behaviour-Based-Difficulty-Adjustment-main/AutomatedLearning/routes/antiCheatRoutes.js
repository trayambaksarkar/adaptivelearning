const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// Log anti-cheat events
router.post("/log-event", protect, async (req, res) => {
  try {
    const { eventType, details, timestamp, violationCount } = req.body;
    
    // Log to console for now (you can store in database later)
    console.log(`[ANTI-CHEAT EVENT] ${new Date().toISOString()}:`, {
      userId: req.user.id,
      eventType,
      details,
      timestamp,
      violationCount
    });
    
    // Here you can also store in database if needed
    // For example: await AntiCheatEvent.create({...});
    
    res.json({
      success: true,
      message: "Event logged successfully"
    });
  } catch (error) {
    console.error("Error logging anti-cheat event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to log event"
    });
  }
});

module.exports = router;

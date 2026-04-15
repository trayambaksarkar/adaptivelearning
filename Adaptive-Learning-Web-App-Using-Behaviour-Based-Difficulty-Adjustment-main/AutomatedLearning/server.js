// IMPORTS
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const passport = require("passport");
const path = require("path");

// Load env variables
dotenv.config();

// DATABASE 
const connectDB = require("./config/db");

// ROUTES
const authRoutes = require("./routes/authRoutes");
const quizRoutes = require("./routes/quizRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes"); //  Added admin routes
const antiCheatRoutes = require("./routes/antiCheatRoutes"); // Added anti-cheat routes

// PASSPORT CONFIG
require("./config/passport");

// APP INIT 
const app = express();

// MIDDLEWARE
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
// app.use(express.static(path.join(__dirname, "../FRONTEND")));

// BASIC ROUTE
app.get("/", (req, res) => {
  res.json({ message: "Backend Server Running Successfully 🚀" });
});

// API ROUTES
app.use("/auth", authRoutes);
app.use("/quiz", quizRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/admin", adminRoutes); // ✅ Mounted admin routes
app.use("/api/anti-cheat", antiCheatRoutes); // ✅ Mounted anti-cheat routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found"
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// SERVER START
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
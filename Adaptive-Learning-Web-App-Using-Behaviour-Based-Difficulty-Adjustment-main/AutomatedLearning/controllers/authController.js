const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
//jwt(json web token) is a secure way to send information between client and server in the form of a digitally signed token 


const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },                 // payload
    process.env.JWT_SECRET,         // secret key
    { expiresIn: "7d" }             // token expiry
  );
};

exports.registerUser = async (req, res) => {
  try {
    const { fullname, username, email, bio, skills, role, password, confirmPassword } = req.body;

    const fullnameStr = (fullname || "").toString().trim();
    const emailStr = (email || "").toString().trim().toLowerCase();
    const usernameStr = (username || "").toString().trim();
    const pwd = (password || "").toString();
    const confirmPwd = (confirmPassword || "").toString();

    if (!fullnameStr || !emailStr || !pwd || !confirmPwd) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (pwd.trim() !== confirmPwd.trim()) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    if (!usernameStr) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    const existingUsername = await User.findOne({ username: usernameStr });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: "Username already taken" });
    }

    const existingUser = await User.findOne({ email: emailStr });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pwd.trim(), salt);

    const user = await User.create({
      fullname: fullnameStr,
      username: usernameStr,
      email: emailStr,
      bio: bio || "",
      skills: skills || [],
      role: role || "student",
      password: hashedPassword
    });

    // ✅ FIXED RESPONSE
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    //compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate token
    // console.log("JWT_SECRET:", process.env.JWT_SECRET);

    const token = generateToken(user._id);

    // Send response
    res.status(200).json({
      message: "Login successful",
      token,
      redirect: "/index",
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        bio: user.bio,
        skills: user.skills,
        role: user.role,
      }
    });

  } catch (error) {
    // console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with that email"
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token before saving to DB
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 10 minutes.</p>
      `
    });

    console.log("Reset email sent to:", user.email);

    return res.status(200).json({
      success: true,
      message: "Password reset email sent"
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful"
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

// Google Auth Handler
// controllers/authController.js
// Google OAuth callback handler
exports.googleAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication failed" });
    }

    // If missing fields → update defaults
    if (!req.user.username) {
      req.user.username = req.user.email.split("@")[0];
    }

    if (!req.user.bio) req.user.bio = "";
    if (!req.user.skills) req.user.skills = [];

    await req.user.save();

    const token = generateToken(req.user._id);

    return res.redirect(`${process.env.CLIENT_URL}/google-success?token=${token}`);
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from authMiddleware
    const { bio, skills } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    if (bio !== undefined) user.bio = bio;
    if (skills !== undefined) user.skills = skills;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        bio: user.bio,
        skills: user.skills,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
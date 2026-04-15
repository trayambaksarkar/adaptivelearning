// src/App.jsx
import React, { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

import GoogleSuccess from "./components/auth/GoogleSuccess";
import Home from "./components/home/Home";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import Dashboard from "./components/dashboard/Dashboard";
import Quiz from "./components/quiz/Quiz";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import AdminDashboard from "./components/admin/AdminDashboard";
import AddQuestion from "./components/admin/AddQuestion";
import AdminAnalytics from "./components/admin/AdminAnalytics";
import QuizReview from "./components/quiz/QuizReview";
// import Navbar from "./components/layout/Navbar"; // 👈 ADD THIS
// import Footer from "./components/layout/Footer"; // 👈 ADD THIS

import "./App.css";

function App() {
  const dotRef = useRef(null);

  useEffect(() => {
    const move = (e) => {
      const { clientX, clientY } = e;

      // 🔴 SMALL DOT (exact cursor)
      if (dotRef.current) {
        dotRef.current.style.left = `${clientX}px`;
        dotRef.current.style.top = `${clientY}px`;
      }
    };

    window.addEventListener("mousemove", move);

    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            {/* <Navbar /> */}
            {/* <div ref={dotRef} className="cursor-dot"></div> */}

            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/google-success" element={<GoogleSuccess />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Student */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/quiz"
                element={
                  <ProtectedRoute>
                    <Quiz />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/quiz-review/:id"
                element={
                  <ProtectedRoute>
                    <QuizReview />
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              >
                <Route path="add-question" element={<AddQuestion />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route index element={<Navigate to="analytics" />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            {/* <Footer/> */}
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
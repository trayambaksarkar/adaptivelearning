import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const GoogleSuccess = () => {
  const navigate = useNavigate();
  const { handleGoogleSuccess } = useAuth();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      handleGoogleSuccess(token);
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, [navigate, handleGoogleSuccess]);
  return <div>Signing you in...</div>;
};

export default GoogleSuccess;
// src/pages/Login.tsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleSelect, setRoleSelect] = useState("Employee"); // visual only for now
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // We rely on AuthContext to fetch role. Redirect to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="wave-bg" />
      <div className="login-card">
        <h3>User Login</h3>
        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <select value={roleSelect} onChange={(e) => setRoleSelect(e.target.value)}>
            <option>Employee</option>
            <option>Manager</option>
            <option>HR</option>
            <option>Admin</option>
          </select>

          <button type="submit" disabled={submitting}>
            {submitting ? "Logging in…" : "Login"}
          </button>

          {error && <div className="error">{error}</div>}
        </form>
        <div className="forgot">
          <a href="#">Forgot password?</a>
        </div>
      </div>
    </div>
  );
};

export default Login;

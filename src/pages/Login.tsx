import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import { useNavigate } from "react-router-dom";


const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  try {
    await login(email, password);
    navigate("/dashboard");   // ⭐ REQUIRED REDIRECT
  } catch (err) {
    setError("Invalid login credentials");
  }
};


  return (
    <div className="login-container">

      <div className="login-card">
        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
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

          {error && <p className="login-error">{error}</p>}

          <button className="login-btn" type="submit">Login</button>
        </form>
      </div>

    </div>
  );
};

export default Login;

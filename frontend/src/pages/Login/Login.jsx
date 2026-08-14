import { useState } from "react";
import "./Login.css";
import shieldLogo from "../../assets/shield.svg";
import { login } from "../../api/authApi";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(username, password);

      // Authentication succeeded.
      // Navigation and authentication state will be added later.
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* Logo */}
        <div className="logo-box">
          <img src={shieldLogo} alt="NexusCorvus" />
        </div>

        <h1>NexusCorvus</h1>

        <p className="subtitle">
          Digital Forensics INVESTIGATION PLATFORM
        </p>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="username">
              USERNAME&nbsp; / &nbsp;EMAIL
            </label>

            <input
              id="username"
              type="text"
              placeholder="analyst@corp.local"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              PASSWORD
            </label>

            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>

        </form>

        {/* Security Notice */}
        <div className="security-notice">
          <p>Authorized personnel only</p>
          <p>security specialist | “Flow state is where hesitation disappears—only steady intent remains, quiet enough to hear your own precision.”</p>
          <br></br>
          <p>By Alexander</p>
        </div>

      </div>
    </div>
  );
}

export default Login;
import { useState } from "react";
import "./Login.css";
import shieldLogo from "../../assets/shield.svg";
import { login } from "../../api/authApi";
import { useNavigate } from "react-router-dom";


function Login() {
  const navigate = useNavigate();

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

      navigate("/cases");

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          <img src={shieldLogo} alt="NexusCorvus" />
        </div>

        <div className="login-brand">
          <h1>NexusCorvus</h1>
          <p className="login-subtitle">
            Digital Forensics Investigation Platform
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>

          <div className="nc-field">
            <label className="nc-field-label" htmlFor="username">
              USERNAME / EMAIL
            </label>
            <input
              id="username"
              className="nc-input"
              type="text"
              placeholder="analyst@corp.local"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="nc-field">
            <label className="nc-field-label" htmlFor="password">
              PASSWORD
            </label>
            <input
              id="password"
              className="nc-input"
              type="password"
              placeholder="••••••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="nc-error-banner">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="nc-btn nc-btn-primary nc-btn-lg login-submit"
            disabled={loading}
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>

        </form>

        <div className="login-notice">
          <p>Authorized personnel only</p>
          <p className="login-quote">
            "Flow state is where hesitation disappears—only steady intent remains, quiet enough to hear your own precision."
          </p>
          <p className="login-author">— Alexander</p>
        </div>

      </div>
    </div>
  );
}

export default Login;
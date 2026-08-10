import "./Login.css";
import shieldLogo from "../../assets/shield.svg";

function Login() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Authentication will be connected to Django later.
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
            />
          </div>

          <button type="submit">
            Sign In
          </button>

        </form>

        {/* Security Notice */}
        <div className="security-notice">
          <p>Authorized personnel only</p>
          <p>security specialist | “Flow state is where hesitation disappears—only steady intent remains, quiet enough to hear your own precision.”</p>
          <br></br>
          <p>By Alexander <Sapo></Sapo></p>
        </div>

      </div>
    </div>
  );
}

export default Login;
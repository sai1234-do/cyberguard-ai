import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Activity,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { operator, signIn } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError(
        "Your name, operator email, and access key are required."
      );
      return;
    }

    try {
      setLoading(true);

      await signIn({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message || "Authentication failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  if (operator) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="login-page">

      {/* Background effects */}
      <div className="cyber-grid"></div>
      <div className="scan-line"></div>

      {/* Top branding */}
      <header className="login-header">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h1>CYBERGUARD AI</h1>
            <span>SECURITY OPERATIONS CENTER</span>
          </div>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          SYSTEM OPERATIONAL
        </div>
      </header>

      {/* Main content */}
      <main className="login-main">

        <section className="login-info">
          <div className="terminal-label">
            <Activity size={15} />
            SECURE NETWORK
          </div>

          <h2>
            DEFEND.
            <br />
            <span>DETECT.</span>
            <br />
            RESPOND.
          </h2>

          <p>
            AI-assisted cybersecurity incident response
            for intelligent threat detection and investigation.
          </p>

          <div className="security-metrics">
            <div>
              <strong>24/7</strong>
              <span>MONITORING</span>
            </div>

            <div>
              <strong>AI</strong>
              <span>THREAT ANALYSIS</span>
            </div>

            <div>
              <strong>REAL-TIME</strong>
              <span>INCIDENT RESPONSE</span>
            </div>
          </div>
        </section>

        {/* Login card */}
        <section className="login-card">

          <div className="card-top-line"></div>

          <div className="login-card-header">
            <div className="lock-icon">
              <LockKeyhole size={22} />
            </div>

            <div>
              <h3>SECURE ACCESS</h3>
              <p>Authenticate to continue</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="name">OPERATOR NAME</label>

              <input
                id="name"
                type="text"
                placeholder="Alex Singh"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                OPERATOR EMAIL
              </label>

              <input
                id="email"
                type="email"
                placeholder="analyst@cyberguard.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                ACCESS KEY
              </label>

              <div className="password-wrapper">

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>
            </div>

            {error && (
              <div className="login-error">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "AUTHENTICATING..."
                : "INITIALIZE SESSION"}
            </button>

          </form>

          <div className="card-footer">
            <span>
              <span className="footer-dot"></span>
              ENCRYPTED CONNECTION
            </span>

            <span>AUTH v1.0</span>
          </div>

        </section>
      </main>

      <footer className="login-footer">
        <span>CYBERGUARD AI</span>
        <span>•</span>
        <span>DEFENSIVE SECURITY PLATFORM</span>
        <span>•</span>
        <span>AUTHORIZED ACCESS ONLY</span>
      </footer>

    </div>
  );
}

export default Login;

"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

function ScorpionMark({ size = 50 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Black Scorpions emblem"
    >
      <defs>
        <linearGradient id="scorpionGold" x1="15" y1="10" x2="85" y2="90">
          <stop offset="0%" stopColor="#FFF2B0" />
          <stop offset="45%" stopColor="#E4BD4F" />
          <stop offset="100%" stopColor="#A87516" />
        </linearGradient>
      </defs>

      <g
        stroke="url(#scorpionGold)"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Scorpion curved tail */}
        <path d="M50 43 C43 34 48 28 57 22 C67 15 66 7 56 7" />
        <path d="M56 7 C48 4 43 10 47 15" />
        <path d="M48 18 L59 20" />
        <path d="M44 26 L58 29" />
        <path d="M43 34 L55 37" />
        <path d="M56 7 C66 1 73 7 66 15" strokeWidth="3" />

        {/* Body */}
        <path
          d="M42 43 Q50 37 58 43 L61 59 Q59 69 50 73 Q41 69 39 59 Z"
          fill="#A87516"
          fillOpacity="0.3"
        />
        <path d="M42 48 Q50 53 58 48" />
        <path d="M40 56 Q50 61 60 56" />
        <path d="M42 64 Q50 68 58 64" />

        {/* Left pincers */}
        <path d="M41 47 C32 39 22 40 17 49 C12 58 19 67 29 64" />
        <path d="M29 64 C22 59 24 52 32 51" />
        <path d="M32 51 L39 56" />

        {/* Right pincers */}
        <path d="M59 47 C68 39 78 40 83 49 C88 58 81 67 71 64" />
        <path d="M71 64 C78 59 76 52 68 51" />
        <path d="M68 51 L61 56" />

        {/* Left legs */}
        <path d="M43 45 L33 37 L25 39 L20 34" />
        <path d="M40 51 L28 48 L21 52 L16 48" />
        <path d="M40 59 L29 61 L24 68 L18 68" />
        <path d="M44 67 L37 74 L35 81 L29 83" />

        {/* Right legs */}
        <path d="M57 45 L67 37 L75 39 L80 34" />
        <path d="M60 51 L72 48 L79 52 L84 48" />
        <path d="M60 59 L71 61 L76 68 L82 68" />
        <path d="M56 67 L63 74 L65 81 L71 83" />

        {/* Head */}
        <path d="M45 42 L43 37" />
        <path d="M55 42 L57 37" />
        <circle cx="46" cy="43" r="1.5" fill="#FFF2B0" stroke="none" />
        <circle cx="54" cy="43" r="1.5" fill="#FFF2B0" stroke="none" />
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.smokeOne} />
      <div style={styles.smokeTwo} />

      <div className="login-card" style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLogo}>
            <ScorpionMark size={39} />
          </div>

          <span style={styles.headerName}>Black Scorpions</span>
        </div>

        <div style={styles.topLine} />

        {/* Main logo */}
        <div style={styles.logo}>
          <div style={styles.logoCircle}>
            <ScorpionMark size={78} />
          </div>

          <h1 style={styles.heading}>BLACK SCORPIONS</h1>

          <div style={styles.goldLine} />

          <p style={styles.subtitle}>RECRUITMENT CRM</p>
        </div>

        {/* Welcome */}
        <div style={styles.welcome}>
          <h2>WELCOME BACK</h2>
          <p>Sign in to access your headquarters</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin}>
          <label style={styles.label}>EMAIL ADDRESS</label>

          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>✉</span>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={styles.input}
            />
          </div>

          <label style={styles.label}>PASSWORD</label>

          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>♙</span>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.loginButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "AUTHENTICATING..." : "LOGIN TO HEADQUARTERS"}
          </button>
        </form>

        {/* Signup */}
        <div style={styles.separator}>
          <span />
          <p>NEW RECRUITER?</p>
          <span />
        </div>

        <a href="/signup" style={styles.signupButton}>
          CREATE ACCOUNT
        </a>

        {/* Footer */}
        <div style={styles.footer}>
          <p>BLACK SCORPIONS © 2026</p>
          <span>POWER • DISCIPLINE • SUCCESS</span>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: #e4bd4f !important;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.15);
        }

        button:hover {
          filter: brightness(1.12);
          transform: translateY(-2px);
        }

        a:hover {
          background: rgba(212, 175, 55, 0.12) !important;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 24px 20px !important;
            border-radius: 20px !important;
          }
        }

        @media (max-height: 850px) {
          .login-card {
            margin: 10px 0;
          }
        }
      `}</style>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse at 50% 45%, #242016 0%, #101010 42%, #050505 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  },

  smokeOne: {
    position: "absolute",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(212,175,55,0.12), transparent 70%)",
    top: "-200px",
    left: "-200px",
    filter: "blur(50px)",
    pointerEvents: "none",
  },

  smokeTwo: {
    position: "absolute",
    width: "650px",
    height: "650px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(120,120,120,0.12), transparent 70%)",
    bottom: "-300px",
    right: "-200px",
    filter: "blur(60px)",
    pointerEvents: "none",
  },

  card: {
    width: "100%",
    maxWidth: "460px",
    background:
      "linear-gradient(145deg, rgba(25,24,21,0.98), rgba(5,5,5,0.99))",
    border: "1px solid rgba(212,175,55,0.75)",
    borderRadius: "24px",
    padding: "30px 32px",
    boxShadow:
      "0 0 45px rgba(212,175,55,0.13), 0 25px 80px rgba(0,0,0,0.8)",
    position: "relative",
    zIndex: 1,
    overflow: "hidden",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "13px",
    paddingBottom: "22px",
    borderBottom: "1px solid rgba(212,175,55,0.2)",
    marginBottom: "23px",
  },

  headerLogo: {
    width: "54px",
    height: "54px",
    minWidth: "54px",
    borderRadius: "50%",
    background: "#090909",
    border: "1px solid #d4af37",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 18px rgba(212,175,55,0.2)",
  },

  headerName: {
    color: "#e6c66b",
    fontSize: "clamp(19px, 5vw, 27px)",
    letterSpacing: "1px",
    fontWeight: "500",
  },

  topLine: {
    height: "3px",
    width: "75px",
    background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
    margin: "0 auto 22px",
  },

  logo: {
    textAlign: "center",
    marginBottom: "28px",
  },

  logoCircle: {
    width: "116px",
    height: "116px",
    border: "2px solid #d4af37",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
    background: "radial-gradient(circle, #292316, #090909 75%)",
    boxShadow:
      "0 0 25px rgba(212,175,55,0.2), inset 0 0 20px rgba(212,175,55,0.08)",
  },

  heading: {
    color: "#e6c66b",
    fontSize: "clamp(22px, 5vw, 27px)",
    fontWeight: "900",
    letterSpacing: "2px",
    margin: 0,
  },

  goldLine: {
    width: "100px",
    height: "2px",
    background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
    margin: "14px auto",
  },

  subtitle: {
    color: "#aaa",
    fontSize: "11px",
    letterSpacing: "5px",
    margin: 0,
  },

  welcome: {
    textAlign: "center",
    marginBottom: "28px",
  },

  label: {
    display: "block",
    color: "#e0bd55",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "2px",
    marginBottom: "10px",
  },

  inputWrapper: {
    position: "relative",
    marginBottom: "22px",
  },

  inputIcon: {
    position: "absolute",
    left: "17px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#d4af37",
    fontSize: "22px",
    zIndex: 1,
  },

  input: {
    width: "100%",
    padding: "17px 15px 17px 52px",
    background: "rgba(12,12,12,0.95)",
    color: "#fff",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "10px",
    fontSize: "14px",
    transition: "0.2s",
  },

  loginButton: {
    width: "100%",
    padding: "17px",
    background: "linear-gradient(135deg, #f0d477, #b58b24)",
    color: "#090909",
    border: "none",
    borderRadius: "9px",
    fontWeight: "900",
    fontSize: "13px",
    letterSpacing: "1px",
    marginTop: "5px",
    transition: "0.2s",
  },

  error: {
    color: "#ff7777",
    background: "rgba(255,0,0,0.08)",
    border: "1px solid rgba(255,80,80,0.3)",
    padding: "12px",
    borderRadius: "7px",
    fontSize: "13px",
    marginBottom: "15px",
  },

  separator: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "25px 0 18px",
  },

  signupButton: {
    display: "block",
    width: "100%",
    textAlign: "center",
    padding: "15px",
    border: "1px solid #d4af37",
    borderRadius: "9px",
    color: "#d4af37",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "1.5px",
    transition: "0.2s",
  },

  footer: {
    borderTop: "1px solid #292929",
    marginTop: "26px",
    paddingTop: "18px",
    textAlign: "center",
    color: "#777",
    fontSize: "10px",
    letterSpacing: "1.5px",
  },
};

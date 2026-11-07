
"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

function ScorpionLogo({ size = 100 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Black Scorpions"
    >
      <defs>
        <linearGradient id="gold" x1="35" y1="15" x2="165" y2="185">
          <stop stopColor="#FFF2B0" />
          <stop offset=".35" stopColor="#E9BE52" />
          <stop offset=".7" stopColor="#B77A19" />
          <stop offset="1" stopColor="#FFE49A" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        stroke="url(#gold)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      >
        {/* Tail */}
        <path
          d="M100 83 C91 65 105 51 124 38 C144 24 143 8 123 9"
          strokeWidth="9"
        />
        <path d="M123 9 C111 2 101 12 108 23" strokeWidth="7" />
        <path d="M119 24 L137 28" strokeWidth="6" />
        <path d="M110 43 L132 49" strokeWidth="6" />
        <path d="M101 62 L122 67" strokeWidth="6" />

        {/* Stinger */}
        <path d="M123 9 C145 1 153 16 137 29" strokeWidth="7" />

        {/* Body */}
        <path
          d="M82 75 Q100 64 118 75 L124 112 Q120 136 100 145 Q80 136 76 112 Z"
          fill="#A87516"
          fillOpacity=".3"
          strokeWidth="6"
        />
        <path d="M80 86 Q100 96 120 86" />
        <path d="M78 100 Q100 111 122 100" />
        <path d="M78 114 Q100 125 122 114" />
        <path d="M85 128 Q100 137 115 128" />

        {/* Head */}
        <path d="M88 77 Q100 67 112 77 L109 88 L91 88 Z" fill="#D9AA36" />
        <circle cx="94" cy="80" r="2.5" fill="#FFF2B0" />
        <circle cx="106" cy="80" r="2.5" fill="#FFF2B0" />

        {/* Left claw */}
        <path d="M80 86 C62 70 43 73 34 91 C25 110 40 126 59 116" />
        <path d="M59 116 C47 106 49 94 65 91" />
        <path d="M65 91 L79 99" />
        <path d="M34 91 L24 82" strokeWidth="7" />

        {/* Right claw */}
        <path d="M120 86 C138 70 157 73 166 91 C175 110 160 126 141 116" />
        <path d="M141 116 C153 106 151 94 135 91" />
        <path d="M135 91 L121 99" />
        <path d="M166 91 L176 82" strokeWidth="7" />

        {/* Left legs */}
        <path d="M82 91 L63 78 L51 82 L44 72" />
        <path d="M78 103 L57 101 L45 110 L34 106" />
        <path d="M80 116 L62 127 L56 140 L44 144" />
        <path d="M87 133 L76 148 L76 160 L65 168" />

        {/* Right legs */}
        <path d="M118 91 L137 78 L149 82 L156 72" />
        <path d="M122 103 L143 101 L155 110 L166 106" />
        <path d="M120 116 L138 127 L144 140 L156 144" />
        <path d="M113 133 L124 148 L124 160 L135 168" />
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
    <main className="login-page">
      <div className="marble-overlay" />
      <div className="gold-smoke smoke-left" />
      <div className="gold-smoke smoke-right" />

      <div className="login-card">
        <div className="corner corner-one" />
        <div className="corner corner-two" />

        <header className="brand-header">
          <div className="small-logo">
            <ScorpionLogo size={66} />
          </div>
          <div className="brand-name">Black Scorpions</div>
        </header>

        <div className="header-divider">
          <span />
        </div>

        <section className="brand-section">
          <div className="hero-logo">
            <ScorpionLogo size={185} />
          </div>

          <h1>BLACK SCORPIONS</h1>

          <div className="title-line" />

          <p className="brand-subtitle">R E C R U I T M E N T &nbsp; C R M</p>
        </section>

        <section className="welcome-section">
          <div className="welcome-title">
            <span />
            <h2>WELCOME BACK</h2>
            <span />
          </div>
          <p>Sign in to access your headquarters</p>
        </section>

        <form onSubmit={handleLogin} className="login-form">
          <label>EMAIL ADDRESS</label>

          <div className="input-box">
            <span className="field-icon">✉</span>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <label>PASSWORD</label>

          <div className="input-box">
            <span className="field-icon">♙</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "AUTHENTICATING..." : "LOGIN TO HEADQUARTERS"}
            <span>››</span>
          </button>
        </form>

        <div className="signup-divider">
          <span />
          <p>NEW RECRUITER?</p>
          <span />
        </div>

        <a href="/signup" className="signup-button">
          <span>♙+</span>
          CREATE ACCOUNT
        </a>

        <footer>
          <p>BLACK SCORPIONS © 2026</p>
          <span>POWER • DISCIPLINE • SUCCESS</span>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          padding: 30px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 50% 30%, #211b0e 0%, transparent 50%),
            linear-gradient(145deg, #080807, #15120b 50%, #050505);
          color: white;
          font-family: Arial, sans-serif;
        }

        .marble-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.35;
          pointer-events: none;
          background:
            repeating-linear-gradient(
              132deg,
              transparent 0px,
              transparent 95px,
              rgba(212, 175, 55, 0.08) 96px,
              transparent 98px
            ),
            radial-gradient(
              ellipse at 5% 50%,
              rgba(212, 175, 55, 0.13),
              transparent 35%
            );
        }

        .gold-smoke {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
        }

        .smoke-left {
          top: -180px;
          left: -180px;
          background: rgba(202, 148, 32, 0.12);
        }

        .smoke-right {
          bottom: -200px;
          right: -180px;
          background: rgba(202, 148, 32, 0.1);
        }

        .login-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 570px;
          padding: 32px 42px;
          border: 1px solid #b98b2e;
          border-radius: 22px;
          background:
            linear-gradient(145deg, rgba(18, 17, 14, 0.97), rgba(4, 4, 4, 0.98));
          box-shadow:
            0 0 30px rgba(212, 175, 55, 0.12),
            0 25px 80px rgba(0, 0, 0, 0.8),
            inset 0 0 30px rgba(212, 175, 55, 0.025);
          overflow: hidden;
        }

        .corner {
          position: absolute;
          width: 28px;
          height: 28px;
          border-color: #e5b94d;
          pointer-events: none;
        }

        .corner-one {
          top: 0;
          left: 0;
          border-top: 3px solid;
          border-left: 3px solid;
        }

        .corner-two {
          bottom: 0;
          right: 0;
          border-bottom: 3px solid;
          border-right: 3px solid;
        }

        .brand-header {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          padding-bottom: 24px;
        }

        .small-logo {
          width: 82px;
          height: 82px;
          border: 1px solid #d4af37;
          border-radius: 50%;
          background: #050505;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
          flex-shrink: 0;
        }

        .brand-name {
          font-size: clamp(21px, 5vw, 35px);
          color: #e9c46a;
          letter-spacing: 1px;
        }

        .header-divider {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(212, 175, 55, 0.7),
            transparent
          );
          margin-bottom: 30px;
        }

        .header-divider span {
          display: block;
          width: 55px;
          height: 2px;
          background: #f0ce69;
          margin: auto;
          box-shadow: 0 0 12px #d4af37;
        }

        .brand-section {
          text-align: center;
          margin-bottom: 38px;
        }

        .hero-logo {
          width: 220px;
          height: 220px;
          max-width: 100%;
          margin: 0 auto 20px;
          border: 2px solid #d4af37;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: radial-gradient(circle, #211a0d, #050505 72%);
          box-shadow:
            0 0 25px rgba(212, 175, 55, 0.23),
            inset 0 0 25px rgba(212, 175, 55, 0.08);
        }

        .brand-section h1 {
          margin: 0;
          font-size: clamp(25px, 6vw, 39px);
          letter-spacing: 3px;
          color: #e8bd56;
          font-weight: 800;
          text-shadow: 0 0 15px rgba(212, 175, 55, 0.15);
        }

        .title-line {
          width: 75%;
          height: 1px;
          margin: 18px auto;
          background: linear-gradient(
            90deg,
            transparent,
            #d4af37,
            transparent
          );
          box-shadow: 0 0 10px #d4af37;
        }

        .brand-subtitle {
          color: #aaa;
          font-size: 12px;
          margin: 0;
        }

        .welcome-section {
          text-align: center;
          margin-bottom: 35px;
        }

        .welcome-title {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
        }

        .welcome-title span {
          height: 1px;
          flex: 1;
          max-width: 45px;
          background: #b98b2e;
        }

        .welcome-section h2 {
          margin: 0;
          font-size: clamp(27px, 7vw, 40px);
          font-weight: 500;
          letter-spacing: 1px;
        }

        .welcome-section p {
          margin: 9px 0 0;
          color: #d2d2d2;
          font-size: 16px;
        }

        .login-form label {
          display: block;
          color: #e7bd55;
          font-size: 13px;
          font-weight: bold;
          letter-spacing: 2px;
          margin: 0 0 12px;
        }

        .input-box {
          display: flex;
          align-items: center;
          gap: 20px;
          width: 100%;
          height: 72px;
          border: 1px solid #b98b2e;
          border-radius: 13px;
          background: rgba(5, 5, 5, 0.8);
          padding: 0 20px;
          margin-bottom: 27px;
          transition: 0.2s;
        }

        .input-box:focus-within {
          border-color: #ffe08a;
          box-shadow: 0 0 16px rgba(212, 175, 55, 0.2);
        }

        .field-icon {
          color: #e4bd59;
          font-size: 25px;
        }

        .input-box input {
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: white;
          font-size: 16px;
        }

        .input-box input::placeholder {
          color: #858585;
        }

        .login-form button {
          width: 100%;
          min-height: 68px;
          border: 1px solid #ffe08a;
          border-radius: 12px;
          background: linear-gradient(135deg, #f6d77d, #b98520);
          color: #100d07;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 1.2px;
          cursor: pointer;
          box-shadow: 0 0 22px rgba(212, 175, 55, 0.2);
          transition: 0.2s;
        }

        .login-form button:hover {
          filter: brightness(1.12);
          transform: translateY(-2px);
        }

        .login-form button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .login-form button span {
          margin-left: 15px;
          font-size: 22px;
        }

        .error-box {
          color: #ff8585;
          background: rgba(255, 0, 0, 0.08);
          border: 1px solid rgba(255, 80, 80, 0.3);
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          margin-bottom: 15px;
        }

        .signup-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin: 30px 0 20px;
        }

        .signup-divider span {
          height: 1px;
          flex: 1;
          background: linear-gradient(90deg, transparent, #b98b2e);
        }

        .signup-divider span:last-child {
          background: linear-gradient(90deg, #b98b2e, transparent);
        }

        .signup-divider p {
          color: #aaa;
          letter-spacing: 4px;
          font-size: 11px;
          white-space: nowrap;
        }

        .signup-button {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          min-height: 65px;
          border: 1px solid #d4af37;
          border-radius: 12px;
          color: #e6bd58;
          text-decoration: none;
          font-size: 14px;
          letter-spacing: 2px;
          font-weight: bold;
          transition: 0.2s;
        }

        .signup-button:hover {
          background: rgba(212, 175, 55, 0.1);
        }

        .signup-button span {
          font-size: 23px;
        }

        footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 22px;
          border-top: 1px solid rgba(212, 175, 55, 0.2);
          color: #aaa;
          letter-spacing: 3px;
          font-size: 10px;
        }

        footer p {
          margin: 0 0 12px;
        }

        footer span {
          color: #d4af37;
          font-weight: bold;
        }

        @media (max-width: 480px) {
          .login-page {
            padding: 18px 12px;
            align-items: flex-start;
          }

          .login-card {
            padding: 24px 20px;
            border-radius: 18px;
          }

          .small-logo {
            width: 65px;
            height: 65px;
          }

          .brand-header {
            gap: 12px;
          }

          .hero-logo {
            width: 175px;
            height: 175px;
          }

          .brand-section {
            margin-bottom: 30px;
          }

          .welcome-section {
            margin-bottom: 28px;
          }

          .input-box {
            height: 64px;
            padding: 0 15px;
          }

          .login-form button {
            min-height: 62px;
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}

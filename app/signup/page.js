
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamLeader, setTeamLeader] = useState("");
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLeaders, setLoadingLeaders] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let mounted = true;

    async function loadTeamLeaders() {
      const { data, error } = await supabase.rpc("get_team_leaders");

      if (!mounted) return;

      if (error) {
        console.error("TEAM LEADERS ERROR:", error);
        setError("Unable to load Team Leaders: " + error.message);
      } else {
        setTeamLeaders(data || []);
      }

      setLoadingLeaders(false);
    }

    loadTeamLeaders();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSignup(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");
    setError("");

    if (!teamLeader) {
      setError("Please choose your Team Leader.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone.trim(),
            team_leader_id: teamLeader,
          },
        },
      });

      if (error) {
        console.error("SUPABASE SIGNUP ERROR:", error);

        setError(
          `Message: ${error.message} | Code: ${
            error.code || "N/A"
          } | Status: ${error.status || "N/A"}`
        );
      } else {
        console.log("SIGNUP RESPONSE:", data);

        setMessage(
          "Account created! Check your email to confirm your account before logging in."
        );

        setName("");
        setPhone("");
        setEmail("");
        setPassword("");
        setTeamLeader("");
      }
    } catch (err) {
      console.error("SIGNUP UNEXPECTED ERROR:", err);

      setError(
        `Message: ${err.message || "Something went wrong."} | Code: ${
          err.code || "N/A"
        } | Status: ${err.status || "N/A"}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.smokeOne}></div>
      <div style={styles.smokeTwo}></div>

      <div style={styles.card}>
        <div style={styles.topLine}></div>

        <div style={styles.logo}>
          <div style={styles.logoCircle}>🦂</div>

          <h1 style={styles.heading}>BLACK SCORPIONS</h1>

          <div style={styles.goldLine}></div>

          <p style={styles.subtitle}>RECRUITMENT CRM</p>
        </div>

        <div style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>JOIN THE TEAM</h2>
          <p style={styles.welcomeText}>
            Create your recruiter account
          </p>
        </div>

        <form onSubmit={handleSignup}>
          <label style={styles.label}>FULL NAME</label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter your full name"
            style={styles.input}
            disabled={loading}
          />

          <label style={styles.label}>PHONE NUMBER</label>

          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="Enter your phone number"
            style={styles.input}
            disabled={loading}
          />

          <label style={styles.label}>EMAIL ADDRESS</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            style={styles.input}
            disabled={loading}
          />

          <label style={styles.label}>PASSWORD</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Minimum 8 characters"
            style={styles.input}
            disabled={loading}
          />

          <label style={styles.label}>
            CHOOSE YOUR TEAM LEADER
          </label>

          <select
            value={teamLeader}
            onChange={(e) => setTeamLeader(e.target.value)}
            required
            disabled={
              loading ||
              loadingLeaders ||
              teamLeaders.length === 0
            }
            style={{
              ...styles.input,
              cursor: "pointer",
              color: teamLeader ? "#fff" : "#999",
            }}
          >
            <option value="">
              {loadingLeaders
                ? "Loading Team Leaders..."
                : "Select Your Team Leader"}
            </option>

            {teamLeaders.map((leader) => (
              <option
                key={leader.id}
                value={leader.id}
                style={{ background: "#111", color: "#fff" }}
              >
                {leader.full_name} ({leader.role})
              </option>
            ))}
          </select>

          {!loadingLeaders && teamLeaders.length === 0 && (
            <p style={styles.error}>
              No Team Leaders available.
            </p>
          )}

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {message && (
            <div style={styles.success}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              loadingLeaders ||
              teamLeaders.length === 0
            }
            style={{
              ...styles.createButton,
              opacity: loading || loadingLeaders ? 0.7 : 1,
            }}
          >
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div style={styles.separator}>
          <span style={styles.separatorLine}></span>
          <p style={styles.separatorText}>ALREADY A MEMBER?</p>
          <span style={styles.separatorLine}></span>
        </div>

        <a href="/login" style={styles.loginButton}>
          LOGIN TO YOUR ACCOUNT
        </a>

        <div style={styles.footer}>
          <p>BLACK SCORPIONS © 2026</p>
          <span>POWER • DISCIPLINE • SUCCESS</span>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: #d4af37 !important;
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.15);
        }

        button:hover:not(:disabled) {
          filter: brightness(1.12);
          transform: translateY(-2px);
        }

        a:hover {
          background: rgba(212, 175, 55, 0.12) !important;
        }

        @media (max-width: 480px) {
          .signup-card {
            padding: 25px 20px !important;
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
    padding: "30px 16px",
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
      "radial-gradient(circle, rgba(212,175,55,0.09), transparent 70%)",
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
    maxWidth: "440px",
    background:
      "linear-gradient(145deg, rgba(28,28,28,0.97), rgba(9,9,9,0.98))",
    border: "1px solid rgba(212,175,55,0.65)",
    borderRadius: "18px",
    padding: "38px 32px",
    boxShadow:
      "0 0 35px rgba(212,175,55,0.10), 0 25px 80px rgba(0,0,0,0.8)",
    position: "relative",
    zIndex: 1,
  },

  topLine: {
    height: "3px",
    width: "75px",
    background:
      "linear-gradient(90deg, transparent, #d4af37, transparent)",
    margin: "0 auto 28px",
  },

  logo: {
    textAlign: "center",
    marginBottom: "30px",
  },

  logoCircle: {
    width: "76px",
    height: "76px",
    border: "1px solid #d4af37",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 17px",
    fontSize: "38px",
    background: "linear-gradient(145deg, #292316, #090909)",
    boxShadow: "0 0 25px rgba(212,175,55,0.16)",
  },

  heading: {
    color: "#d4af37",
    fontSize: "25px",
    fontWeight: "900",
    letterSpacing: "2px",
    margin: 0,
  },

  goldLine: {
    width: "100px",
    height: "1px",
    background: "#d4af37",
    margin: "15px auto",
  },

  subtitle: {
    color: "#999",
    fontSize: "11px",
    letterSpacing: "4px",
    margin: 0,
  },

  welcome: {
    textAlign: "center",
    marginBottom: "27px",
  },

  welcomeTitle: {
    color: "#fff",
    fontSize: "19px",
    letterSpacing: "2px",
    margin: "0 0 9px",
  },

  welcomeText: {
    color: "#999",
    fontSize: "13px",
    margin: 0,
  },

  label: {
    display: "block",
    color: "#d4af37",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1.5px",
    marginBottom: "9px",
  },

  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "19px",
    background: "#111",
    color: "#fff",
    border: "1px solid #393939",
    borderRadius: "8px",
    fontSize: "14px",
    transition: "0.2s",
  },

  createButton: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #f0d477, #b58b24)",
    color: "#090909",
    border: "none",
    borderRadius: "8px",
    fontWeight: "900",
    fontSize: "13px",
    letterSpacing: "1px",
    cursor: "pointer",
    marginTop: "8px",
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
    overflowWrap: "anywhere",
  },

  success: {
    color: "#d4af37",
    background: "rgba(212,175,55,0.08)",
    border: "1px solid rgba(212,175,55,0.3)",
    padding: "12px",
    borderRadius: "7px",
    fontSize: "13px",
    marginBottom: "15px",
    lineHeight: "1.5",
  },

  separator: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "27px 0 20px",
  },

  separatorLine: {
    flex: 1,
    height: "1px",
    background: "#333",
  },

  separatorText: {
    color: "#777",
    fontSize: "10px",
    letterSpacing: "1px",
    whiteSpace: "nowrap",
  },

  loginButton: {
    display: "block",
    width: "100%",
    textAlign: "center",
    padding: "15px",
    border: "1px solid #d4af37",
    borderRadius: "8px",
    color: "#d4af37",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "1.5px",
    transition: "0.2s",
  },

  footer: {
    borderTop: "1px solid #292929",
    marginTop: "30px",
    paddingTop: "20px",
    textAlign: "center",
    color: "#777",
    fontSize: "10px",
    letterSpacing: "1.5px",
  },
};

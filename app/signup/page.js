
"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone
          }
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Account created! Check your email to confirm your account before logging in."
        );
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }

    setLoading(false);
  }

  const inputStyle = {
    width: "100%",
    padding: 13,
    marginTop: 7,
    marginBottom: 17,
    background: "#222",
    color: "white",
    border: "1px solid #444",
    borderRadius: 7,
    boxSizing: "border-box"
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#080808",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      fontFamily: "Arial"
    }}>
      <form onSubmit={handleSignup} style={{
        width: "100%",
        maxWidth: 420,
        background: "#151515",
        border: "1px solid #d4af37",
        borderRadius: 15,
        padding: 30
      }}>
        <h1 style={{ color: "#d4af37", textAlign: "center" }}>
          🦂 BLACK SCORPIONS
        </h1>

        <p style={{ textAlign: "center", color: "#999" }}>
          Recruiter Registration
        </p>

        <label>Full Name</label>
        <input
          style={inputStyle}
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Enter your full name"
        />

        <label>Phone Number</label>
        <input
          style={inputStyle}
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
          placeholder="Enter your phone number"
        />

        <label>Email</label>
        <input
          type="email"
          style={inputStyle}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />

        <label>Password</label>
        <input
          type="password"
          style={inputStyle}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Minimum 8 characters"
        />

        {error && (
          <p style={{ color: "#ff5555" }}>{error}</p>
        )}

        {message && (
          <p style={{ color: "#d4af37" }}>{message}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            background: "#d4af37",
            color: "#000",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          {loading ? "Creating Account..." : "CREATE ACCOUNT"}
        </button>

        <p style={{
          textAlign: "center",
          color: "#999",
          marginTop: 20
        }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "#d4af37" }}>
            Login
          </a>
        </p>
      </form>
    </main>
  );
}

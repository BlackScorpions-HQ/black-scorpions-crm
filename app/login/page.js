
"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

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
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
        padding: 20,
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#151515",
          border: "1px solid #d4af37",
          borderRadius: 15,
          padding: 30,
        }}
      >
        <h1 style={{ color: "#d4af37", textAlign: "center" }}>
          🦂 BLACK SCORPIONS
        </h1>

        <p style={{ textAlign: "center", color: "#999" }}>
          Recruitment CRM
        </p>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ color: "#ff5555" }}>{error}</p>
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
            cursor: "pointer",
            marginTop: 15,
          }}
        >
          {loading ? "Signing in..." : "LOGIN"}
        </button>
      </form>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginTop: 8,
  marginBottom: 20,
  background: "#222",
  color: "white",
  border: "1px solid #444",
  borderRadius: 7,
  boxSizing: "border-box",
};

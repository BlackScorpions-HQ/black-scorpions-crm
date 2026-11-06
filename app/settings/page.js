
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function SettingsPage() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [requests, setRequests] = useState([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        window.location.href = "/login";
        return;
      }

      setUser(currentUser);

      setName(currentUser.user_metadata?.full_name || "");
      setPhone(currentUser.user_metadata?.phone || "");

      const { data: profile, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (roleError) throw roleError;

      setRole(profile?.role || "");

      await loadRequests(currentUser.id);
    } catch (err) {
      setError(err.message || "Unable to load settings.");
    }

    setLoading(false);
  }

  async function loadRequests(userId) {
    const { data, error } = await supabase
      .from("account_change_requests")
      .select(
        "id, request_type, old_value, requested_value, status, created_at, reviewed_at"
      )
      .eq("user_id", userId)
      .in("request_type", ["full_name", "phone"])
      .order("created_at", { ascending: false });

    if (error) throw error;

    setRequests(data || []);
  }

  async function sendRequest(type, requestedValue) {
    setMessage("");
    setError("");

    if (!user) return;

    if (!["full_name", "phone"].includes(type)) {
      setError("Unsupported request type.");
      return;
    }

    if (!requestedValue?.trim()) {
      setError("Please enter the requested value.");
      return;
    }

    const existingPending = requests.some(
      (item) =>
        item.request_type === type &&
        ["Pending", "Processing"].includes(item.status)
    );

    if (existingPending) {
      setError(
        "You already have a pending request of this type."
      );
      return;
    }

    setSaving(type);

    try {
      let oldValue = null;

      if (type === "full_name") {
        oldValue = user.user_metadata?.full_name || "";
      }

      if (type === "phone") {
        oldValue = user.user_metadata?.phone || "";
      }

      const { error: insertError } = await supabase
        .from("account_change_requests")
        .insert({
          user_id: user.id,
          user_name:
            user.user_metadata?.full_name || user.email,
          user_email: user.email,
          request_type: type,
          old_value: oldValue,
          requested_value: requestedValue.trim(),
          status: "Pending",
        });

      if (insertError) throw insertError;

      setMessage(
        "Your request has been submitted successfully. Waiting for CEO approval."
      );

      if (type === "full_name") {
        setName(user.user_metadata?.full_name || "");
      }

      if (type === "phone") {
        setPhone(user.user_metadata?.phone || "");
      }

      await loadRequests(user.id);
    } catch (err) {
      setError(err.message || "Unable to submit request.");
    }

    setSaving("");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function requestLabel(type) {
    if (type === "full_name") return "Name Change";
    if (type === "phone") return "Phone Number Change";
    return type;
  }

  function statusStyle(status) {
    if (status === "Approved") return styles.approved;
    if (status === "Denied") return styles.denied;
    if (status === "Processing") return styles.processing;
    return styles.pending;
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.center}>
          <div style={styles.logo}>🦂</div>
          <h2 style={styles.gold}>BLACK SCORPIONS</h2>
          <p style={styles.muted}>Loading Settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>🦂</div>
        <h1 style={styles.heading}>SETTINGS & ADMINISTRATION</h1>
        <p style={styles.muted}>
          BLACK SCORPIONS RECRUITMENT CRM
        </p>
        <div style={styles.goldLine} />
      </header>

      {error && <div style={styles.error}>{error}</div>}
      {message && <div style={styles.success}>{message}</div>}

      {/* ACCOUNT INFORMATION */}
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>ACCOUNT INFORMATION</h2>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>EMAIL ADDRESS</span>
          <strong style={styles.infoValue}>{user?.email}</strong>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>ACCOUNT ROLE</span>
          <strong style={styles.role}>{role || "Unknown"}</strong>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>ACCOUNT ID</span>
          <span style={styles.smallValue}>{user?.id}</span>
        </div>
      </section>

      {/* PROFILE SETTINGS */}
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>PROFILE SETTINGS</h2>

        <p style={styles.description}>
          Request changes to your personal account information.
          Changes will only take effect after CEO approval.
        </p>

        <label style={styles.label}>CURRENT NAME</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your requested name"
        />

        <button
          style={styles.button}
          disabled={!!saving}
          onClick={() => sendRequest("full_name", name)}
        >
          {saving === "full_name"
            ? "SENDING..."
            : "REQUEST NAME CHANGE"}
        </button>

        <div style={styles.separator} />

        <label style={styles.label}>CURRENT PHONE NUMBER</label>
        <input
          style={styles.input}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter your requested phone number"
        />

        <button
          style={styles.button}
          disabled={!!saving}
          onClick={() => sendRequest("phone", phone)}
        >
          {saving === "phone"
            ? "SENDING..."
            : "REQUEST PHONE CHANGE"}
        </button>
      </section>

      {/* REQUEST HISTORY */}
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>MY CHANGE REQUESTS</h2>

        {requests.length === 0 ? (
          <p style={styles.muted}>
            You haven't submitted any change requests yet.
          </p>
        ) : (
          <div style={styles.requestList}>
            {requests.map((item) => (
              <div key={item.id} style={styles.requestItem}>
                <div style={styles.requestTop}>
                  <strong style={styles.infoValue}>
                    {requestLabel(item.request_type)}
                  </strong>

                  <span style={statusStyle(item.status)}>
                    {item.status}
                  </span>
                </div>

                <div style={styles.changeDetails}>
                  <p>
                    <span style={styles.muted}>Previous:</span>{" "}
                    {item.old_value || "Not provided"}
                  </p>

                  <p>
                    <span style={styles.muted}>Requested:</span>{" "}
                    {item.requested_value || "Not provided"}
                  </p>
                </div>

                <p style={styles.date}>
                  Submitted:{" "}
                  {new Date(item.created_at).toLocaleString()}
                </p>

                {item.reviewed_at && (
                  <p style={styles.date}>
                    Reviewed:{" "}
                    {new Date(item.reviewed_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          style={styles.refreshButton}
          onClick={() => loadRequests(user.id)}
        >
          REFRESH REQUESTS
        </button>
      </section>

      {/* CEO ADMINISTRATION */}
      {role === "CEO" && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>CEO ADMINISTRATION</h2>

          <p style={styles.description}>
            You have CEO-level access to the CRM.
          </p>

          <a href="/account-management" style={styles.adminLink}>
            ACCOUNT MANAGEMENT ↗
          </a>

          <p style={styles.muted}>
            Account change approvals will be available in your
            Dashboard notification center.
          </p>
        </section>
      )}

      <a href="/" style={styles.backButton}>
        ← BACK TO DASHBOARD
      </a>

      <button onClick={logout} style={styles.logout}>
        LOG OUT
      </button>

      <footer style={styles.footer}>
        🦂 BLACK SCORPIONS
        <p>POWER • PRECISION • PERFORMANCE</p>
      </footer>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse at 50% 20%, #242016 0%, #101010 45%, #050505 100%)",
    color: "#fff",
    padding: "25px 16px 50px",
    fontFamily: "Arial, sans-serif",
  },

  center: {
    minHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    textAlign: "center",
    marginBottom: 30,
  },

  logo: {
    fontSize: 48,
    marginBottom: 10,
    filter: "drop-shadow(0 0 10px rgba(212,175,55,.5))",
  },

  heading: {
    color: "#f2d477",
    fontSize: "clamp(20px, 5vw, 30px)",
    letterSpacing: 1.5,
    overflowWrap: "anywhere",
  },

  gold: {
    color: "#f2d477",
  },

  goldLine: {
    width: 130,
    height: 2,
    margin: "18px auto",
    background:
      "linear-gradient(90deg, transparent, #d4af37, transparent)",
  },

  muted: {
    color: "#999",
    fontSize: 13,
    lineHeight: 1.6,
  },

  card: {
    maxWidth: 750,
    margin: "0 auto 22px",
    padding: 22,
    background:
      "linear-gradient(145deg,rgba(25,25,25,.97),rgba(7,7,7,.98))",
    border: "1px solid #8d6c25",
    borderRadius: 14,
    boxShadow: "0 0 18px rgba(212,175,55,.08)",
  },

  sectionTitle: {
    color: "#f2d477",
    fontSize: 18,
    letterSpacing: 1,
    marginTop: 0,
    marginBottom: 20,
  },

  description: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 1.7,
    marginBottom: 20,
  },

  infoRow: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    padding: "13px 0",
    borderBottom: "1px solid #302819",
  },

  infoLabel: {
    color: "#d4af37",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },

  infoValue: {
    color: "#fff",
    overflowWrap: "anywhere",
  },

  smallValue: {
    color: "#aaa",
    fontSize: 11,
    overflowWrap: "anywhere",
  },

  role: {
    color: "#f2d477",
    fontWeight: "bold",
  },

  label: {
    display: "block",
    color: "#d4af37",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1.2,
    marginBottom: 9,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 14,
    marginBottom: 15,
    background: "#101010",
    color: "#fff",
    border: "1px solid #514323",
    borderRadius: 8,
    fontSize: 14,
  },

  button: {
    width: "100%",
    padding: 15,
    background: "linear-gradient(135deg,#fff0a6,#d4af37,#98701e)",
    color: "#080808",
    border: "none",
    borderRadius: 8,
    fontWeight: "900",
    letterSpacing: 1,
    cursor: "pointer",
    marginTop: 5,
  },

  separator: {
    height: 1,
    background: "#49391b",
    margin: "25px 0",
  },

  requestList: {
    display: "grid",
    gap: 13,
  },

  requestItem: {
    padding: 15,
    background: "#101010",
    border: "1px solid #49391b",
    borderRadius: 9,
  },

  requestTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },

  changeDetails: {
    color: "#ddd",
    fontSize: 13,
    overflowWrap: "anywhere",
  },

  date: {
    color: "#777",
    fontSize: 11,
    marginTop: 12,
  },

  pending: {
    color: "#f2d477",
    border: "1px solid #9b792c",
    borderRadius: 5,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: "bold",
  },

  processing: {
    color: "#a9c8ff",
    border: "1px solid #42618c",
    borderRadius: 5,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: "bold",
  },

  approved: {
    color: "#65d69a",
    border: "1px solid #287a50",
    borderRadius: 5,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: "bold",
  },

  denied: {
    color: "#ff8888",
    border: "1px solid #883d3d",
    borderRadius: 5,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: "bold",
  },

  refreshButton: {
    width: "100%",
    marginTop: 18,
    padding: 12,
    background: "#171717",
    color: "#d4af37",
    border: "1px solid #8d6c25",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  adminLink: {
    display: "block",
    padding: 14,
    marginBottom: 15,
    color: "#f2d477",
    border: "1px solid #8d6c25",
    borderRadius: 8,
    textDecoration: "none",
    textAlign: "center",
    fontWeight: "bold",
  },

  backButton: {
    display: "block",
    maxWidth: 750,
    margin: "25px auto 12px",
    padding: 14,
    color: "#f2d477",
    textAlign: "center",
    textDecoration: "none",
    border: "1px solid #8d6c25",
    borderRadius: 8,
  },

  logout: {
    display: "block",
    width: "100%",
    maxWidth: 750,
    margin: "12px auto",
    padding: 14,
    color: "#080808",
    background: "linear-gradient(135deg,#fff0a6,#d4af37,#98701e)",
    border: "none",
    borderRadius: 8,
    fontWeight: "900",
    cursor: "pointer",
  },

  error: {
    maxWidth: 750,
    margin: "0 auto 18px",
    padding: 13,
    color: "#ff8888",
    background: "#281313",
    border: "1px solid #883d3d",
    borderRadius: 8,
  },

  success: {
    maxWidth: 750,
    margin: "0 auto 18px",
    padding: 13,
    color: "#f2d477",
    background: "#211b0c",
    border: "1px solid #8d6c25",
    borderRadius: 8,
  },

  footer: {
    marginTop: 40,
    padding: 20,
    borderTop: "1px solid #49391b",
    textAlign: "center",
    color: "#d4af37",
    letterSpacing: 2,
    fontSize: 13,
  },
};


"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function CandidatesPage() {
  const [supabase] = useState(() => createClient());

  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    english_level: "B1",
    location: "",
    graduation_status: "Graduate",
    work_type: "WFS"
  });

  async function initialize() {
    setLoading(true);
    setMessage("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      setMessage("Please log in again.");
      setLoading(false);
      return;
    }

    const { data: userRole, error: roleError } =
      await supabase.rpc("current_user_role");

    if (roleError) {
      setMessage("Role Error: " + roleError.message);
      setLoading(false);
      return;
    }

    setRole(userRole || "");
    await loadCandidates();
  }

  async function loadCandidates() {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setCandidates(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    initialize();
  }, []);

  async function addCandidate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      setMessage("Please log in again.");
      setSaving(false);
      return;
    }

    const user = authData.user;

    const recruiterName =
      user.user_metadata?.full_name ||
      user.email ||
      "Unknown Recruiter";

    const { error } = await supabase
      .from("candidates")
      .insert({
        ...form,
        created_by: user.id,
        recruiter_name: recruiterName
      });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Candidate added successfully!");

      setForm({
        full_name: "",
        phone: "",
        english_level: "B1",
        location: "",
        graduation_status: "Graduate",
        work_type: "WFS"
      });

      await loadCandidates();
    }

    setSaving(false);
  }

  async function deleteCandidate(candidate) {
    if (role !== "CEO") {
      setMessage("Only the CEO can delete candidates.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${candidate.full_name}?`
    );

    if (!confirmed) return;

    setDeletingId(candidate.id);
    setMessage("");

    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidate.id);

    if (error) {
      setMessage("Delete Error: " + error.message);
    } else {
      setCandidates(previous =>
        previous.filter(item => item.id !== candidate.id)
      );

      setMessage("Candidate deleted successfully!");
    }

    setDeletingId(null);
  }

  const filtered = candidates.filter(candidate =>
    `${candidate.full_name} ${candidate.phone} ${candidate.recruiter_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const inputStyle = {
    width: "100%",
    padding: 12,
    marginTop: 7,
    marginBottom: 15,
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
      padding: 20,
      fontFamily: "Arial"
    }}>
      <a href="/" style={{ color: "#d4af37" }}>
        ← Back to Dashboard
      </a>

      <h1 style={{ color: "#d4af37", marginTop: 25 }}>
        🦂 Candidates
      </h1>

      <p style={{ color: "#999" }}>
        Candidate Management Database
      </p>

      <p style={{ color: "#d4af37" }}>
        Your Role: {role || "Loading..."}
      </p>

      <section style={{
        background: "#171717",
        border: "1px solid #d4af37",
        borderRadius: 12,
        padding: 20,
        marginTop: 25
      }}>
        <h2 style={{ color: "#d4af37" }}>
          Add New Candidate
        </h2>

        <form onSubmit={addCandidate}>
          <label>Full Name</label>
          <input
            style={inputStyle}
            required
            value={form.full_name}
            onChange={e => setForm({
              ...form, full_name: e.target.value
            })}
            placeholder="Candidate full name"
          />

          <label>Phone Number</label>
          <input
            style={inputStyle}
            required
            value={form.phone}
            onChange={e => setForm({
              ...form, phone: e.target.value
            })}
            placeholder="Phone number"
          />

          <label>English Level</label>
          <select
            style={inputStyle}
            value={form.english_level}
            onChange={e => setForm({
              ...form, english_level: e.target.value
            })}
          >
            {["A1", "A2", "B1", "B2", "C1", "C2"].map(level =>
              <option key={level}>{level}</option>
            )}
          </select>

          <label>Location</label>
          <input
            style={inputStyle}
            required
            value={form.location}
            onChange={e => setForm({
              ...form, location: e.target.value
            })}
            placeholder="Candidate location"
          />

          <label>Graduation Status</label>
          <select
            style={inputStyle}
            value={form.graduation_status}
            onChange={e => setForm({
              ...form, graduation_status: e.target.value
            })}
          >
            {["Graduate", "Undergraduate", "Gap Year", "Dropout"]
              .map(value => <option key={value}>{value}</option>)}
          </select>

          <label>Work Type</label>
          <select
            style={inputStyle}
            value={form.work_type}
            onChange={e => setForm({
              ...form, work_type: e.target.value
            })}
          >
            {["WFS", "WFH", "Both"].map(value =>
              <option key={value}>{value}</option>
            )}
          </select>

          <button
            type="submit"
            disabled={saving}
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
            {saving ? "Saving..." : "ADD CANDIDATE"}
          </button>
        </form>

        {message && (
          <p style={{
            color: message.includes("Error") ? "#ff6666" : "#d4af37",
            overflowWrap: "anywhere"
          }}>
            {message}
          </p>
        )}
      </section>

      <section style={{ marginTop: 30 }}>
        <h2 style={{ color: "#d4af37" }}>
          Candidates ({filtered.length})
        </h2>

        <input
          style={inputStyle}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or recruiter..."
        />

        {loading ? (
          <p>Loading candidates...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#999" }}>No candidates found.</p>
        ) : (
          filtered.map(candidate => (
            <article
              key={candidate.id}
              style={{
                background: "#171717",
                border: "1px solid #333",
                borderRadius: 10,
                padding: 16,
                marginBottom: 12
              }}
            >
              <h3 style={{ color: "#d4af37" }}>
                {candidate.full_name}
              </h3>

              <p>Phone: {candidate.phone}</p>
              <p>English: {candidate.english_level}</p>
              <p>Location: {candidate.location}</p>
              <p>Graduation: {candidate.graduation_status}</p>
              <p>Work Type: {candidate.work_type}</p>

              <p style={{ color: "#d4af37" }}>
                Added By: {candidate.recruiter_name || "Not recorded"}
              </p>

              {role === "CEO" && (
                <button
                  type="button"
                  onClick={() => deleteCandidate(candidate)}
                  disabled={deletingId === candidate.id}
                  style={{
                    background: "#b91c1c",
                    color: "white",
                    border: "none",
                    borderRadius: 7,
                    padding: "10px 16px",
                    fontWeight: "bold",
                    cursor: deletingId === candidate.id
                      ? "not-allowed"
                      : "pointer",
                    opacity: deletingId === candidate.id ? 0.6 : 1
                  }}
                >
                  {deletingId === candidate.id
                    ? "Deleting..."
                    : "🗑️ DELETE CANDIDATE"}
                </button>
              )}
            </article>
          ))
        )}
      </section>
    </main>
  );
}

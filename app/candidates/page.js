
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function CandidatesPage() {
  const [supabase] = useState(() => createClient());

  const [candidates, setCandidates] = useState([]);
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    full_name: "",
    phone: "",
    english_level: "B1",
    location: "",
    graduation_status: "Graduate",
    work_type: "WFS",
    offer_name: ""
  };

  const [form, setForm] = useState(initialForm);

  const canManageCandidates = ["CEO", "Assistant"].includes(role);
  const canAddCandidates = ["CEO", "Assistant", "Recruiter"].includes(role);

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

    await Promise.all([
      loadCandidates(),
      loadOffers()
    ]);
  }

  async function loadCandidates() {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Candidates Error: " + error.message);
    } else {
      setCandidates(data || []);
    }

    setLoading(false);
  }

  async function loadOffers() {
    const { data, error } = await supabase
      .from("job_offers")
      .select("title")
      .order("title", { ascending: true });

    if (error) {
      setMessage("Offers Error: " + error.message);
      return;
    }

    const uniqueOffers = [
      ...new Set(
        (data || [])
          .map(offer => offer.title)
          .filter(Boolean)
      )
    ];

    setOffers(uniqueOffers);
  }

  useEffect(() => {
    initialize();
  }, []);

  function updateForm(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  function startEditing(candidate) {
    if (!canManageCandidates) return;

    setEditingId(candidate.id);

    setForm({
      full_name: candidate.full_name || "",
      phone: candidate.phone || "",
      english_level: candidate.english_level || "B1",
      location: candidate.location || "",
      graduation_status: candidate.graduation_status || "Graduate",
      work_type: candidate.work_type || "WFS",
      offer_name: candidate.offer_name || ""
    });

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm({ ...initialForm });
    setMessage("");
  }

  async function addCandidate(e) {
    e.preventDefault();

    if (!canAddCandidates) {
      setMessage("You do not have permission to add candidates.");
      return;
    }

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
      setForm({ ...initialForm });
      await loadCandidates();
    }

    setSaving(false);
  }

  async function saveCandidate(e) {
    e.preventDefault();

    if (!canManageCandidates || !editingId) {
      setMessage("You do not have permission to edit candidates.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("candidates")
      .update({
        full_name: form.full_name,
        phone: form.phone,
        english_level: form.english_level,
        location: form.location,
        graduation_status: form.graduation_status,
        work_type: form.work_type,
        offer_name: form.offer_name
      })
      .eq("id", editingId);

    if (error) {
      setMessage("Update Error: " + error.message);
    } else {
      setMessage("Candidate updated successfully!");
      setEditingId(null);
      setForm({ ...initialForm });
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
    `${candidate.full_name} ${candidate.phone} ${candidate.recruiter_name || ""} ${candidate.offer_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const inputStyle = {
    width: "100%",
    padding: "14px",
    marginTop: "8px",
    marginBottom: "17px",
    background: "#101010",
    color: "#fff",
    border: "1px solid #80651f",
    borderRadius: "9px",
    boxSizing: "border-box",
    outline: "none",
    fontSize: "14px"
  };

  const labelStyle = {
    display: "block",
    color: "#d4af37",
    fontWeight: "bold",
    fontSize: "14px"
  };

  const buttonStyle = {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(110deg,#8c691b,#f5dc85,#b68b25)",
    color: "#080808",
    border: "1px solid #f5dc85",
    borderRadius: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
    cursor: "pointer",
    boxShadow: "0 0 18px rgba(212,175,55,0.13)"
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: `
        radial-gradient(ellipse at 50% 0%, rgba(110,85,30,0.16), transparent 48%),
        radial-gradient(ellipse at 0% 45%, rgba(130,130,130,0.08), transparent 40%),
        radial-gradient(ellipse at 100% 80%, rgba(120,120,120,0.07), transparent 40%),
        #050505
      `,
      color: "#fff",
      padding: "22px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: "950px",
        margin: "auto"
      }}>

        <a href="/" style={{
          color: "#d4af37",
          textDecoration: "none",
          fontWeight: "bold"
        }}>
          ← Back to Dashboard
        </a>

        <header style={{
          textAlign: "center",
          margin: "35px 0"
        }}>
          <div style={{
            fontSize: "45px",
            color: "#d4af37",
            textShadow: "0 0 20px rgba(212,175,55,0.4)"
          }}>
            ♆
          </div>

          <h1 style={{
            color: "#e5c45c",
            letterSpacing: "3px",
            fontSize: "clamp(25px,5vw,36px)",
            textShadow: "0 0 16px rgba(212,175,55,0.2)"
          }}>
            BLACK SCORPIONS
          </h1>

          <p style={{
            color: "#999",
            letterSpacing: "2px",
            marginTop: "9px",
            fontSize: "12px"
          }}>
            CANDIDATE MANAGEMENT DATABASE
          </p>

          <div style={{
            width: "110px",
            height: "2px",
            background: "linear-gradient(90deg,transparent,#d4af37,transparent)",
            margin: "20px auto"
          }} />
        </header>

        <section style={{
          background: "linear-gradient(145deg,#191919,#0c0c0c)",
          border: "1px solid #80651f",
          borderRadius: "15px",
          padding: "18px",
          marginBottom: "25px",
          boxShadow: "0 10px 35px rgba(0,0,0,0.5)"
        }}>
          <p style={{ color: "#999", fontSize: "13px" }}>
            CURRENT ACCESS LEVEL
          </p>

          <h2 style={{
            color: "#e5c45c",
            marginTop: "8px"
          }}>
            {role || "Loading..."}
          </h2>
        </section>

        {message && (
          <div style={{
            background: "#1b170d",
            border: "1px solid #a98732",
            color: "#e5c45c",
            padding: "14px",
            borderRadius: "9px",
            marginBottom: "20px",
            overflowWrap: "anywhere"
          }}>
            {message}
          </div>
        )}

        {canAddCandidates && (
          <section style={{
            background: "linear-gradient(145deg,#191919,#0c0c0c)",
            border: "1px solid #80651f",
            borderRadius: "15px",
            padding: "22px",
            marginBottom: "35px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.4)"
          }}>
            <h2 style={{
              color: "#e5c45c",
              marginBottom: "22px"
            }}>
              {editingId ? "🦂 Edit Candidate" : "🦂 Add New Candidate"}
            </h2>

            <form onSubmit={editingId ? saveCandidate : addCandidate}>
              <label style={labelStyle}>Full Name</label>
              <input
                style={inputStyle}
                required
                value={form.full_name}
                onChange={e => updateForm("full_name", e.target.value)}
                placeholder="Candidate full name"
              />

              <label style={labelStyle}>Phone Number</label>
              <input
                style={inputStyle}
                required
                value={form.phone}
                onChange={e => updateForm("phone", e.target.value)}
                placeholder="Phone number"
              />

              <label style={labelStyle}>Offer Name</label>
              <select
                style={inputStyle}
                required
                value={form.offer_name}
                onChange={e => updateForm("offer_name", e.target.value)}
              >
                <option value="">Select an offer</option>

                {offers.map(offer => (
                  <option key={offer} value={offer}>
                    {offer}
                  </option>
                ))}

                {form.offer_name && !offers.includes(form.offer_name) && (
                  <option value={form.offer_name}>
                    {form.offer_name}
                  </option>
                )}
              </select>

              {offers.length === 0 && (
                <p style={{
                  color: "#999",
                  fontSize: "12px",
                  marginTop: "-10px",
                  marginBottom: "17px"
                }}>
                  No offers found. Add offers in Job Offers first.
                </p>
              )}

              <label style={labelStyle}>English Level</label>
              <select
                style={inputStyle}
                value={form.english_level}
                onChange={e => updateForm("english_level", e.target.value)}
              >
                {["A1","A2","B1","B2","C1","C2"].map(level =>
                  <option key={level}>{level}</option>
                )}
              </select>

              <label style={labelStyle}>Location</label>
              <input
                style={inputStyle}
                required
                value={form.location}
                onChange={e => updateForm("location", e.target.value)}
                placeholder="Candidate location"
              />

              <label style={labelStyle}>Graduation Status</label>
              <select
                style={inputStyle}
                value={form.graduation_status}
                onChange={e => updateForm("graduation_status", e.target.value)}
              >
                {["Graduate","Undergraduate","Gap Year","Dropout"].map(value =>
                  <option key={value}>{value}</option>
                )}
              </select>

              <label style={labelStyle}>Work Type</label>
              <select
                style={inputStyle}
                value={form.work_type}
                onChange={e => updateForm("work_type", e.target.value)}
              >
                {["WFS","WFH","Both"].map(value =>
                  <option key={value}>{value}</option>
                )}
              </select>

              <button
                type="submit"
                disabled={saving || offers.length === 0}
                style={{
                  ...buttonStyle,
                  opacity: saving || offers.length === 0 ? 0.6 : 1
                }}
              >
                {saving
                  ? "SAVING..."
                  : editingId
                    ? "SAVE CHANGES"
                    : "🦂 ADD CANDIDATE"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  style={{
                    ...buttonStyle,
                    marginTop: "12px",
                    background: "#252525",
                    color: "#ddd",
                    border: "1px solid #555",
                    boxShadow: "none"
                  }}
                >
                  CANCEL EDITING
                </button>
              )}
            </form>
          </section>
        )}

        <section>
          <h2 style={{
            color: "#e5c45c",
            marginBottom: "15px"
          }}>
            🦂 Candidates ({filtered.length})
          </h2>

          <input
            style={inputStyle}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, offer or recruiter..."
          />

          {loading ? (
            <p style={{ color: "#d4af37" }}>Loading candidates...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#999" }}>No candidates found.</p>
          ) : (
            filtered.map(candidate => (
              <article
                key={candidate.id}
                style={{
                  background: "linear-gradient(145deg,#191919,#0b0b0b)",
                  border: "1px solid #57451b",
                  borderRadius: "13px",
                  padding: "19px",
                  marginBottom: "15px",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.35)"
                }}
              >
                <h3 style={{
                  color: "#e5c45c",
                  fontSize: "19px",
                  marginBottom: "13px"
                }}>
                  🦂 {candidate.full_name}
                </h3>

                <div style={{
                  color: "#ccc",
                  lineHeight: "1.9",
                  fontSize: "14px"
                }}>
                  <p><b style={{color:"#d4af37"}}>Phone:</b> {candidate.phone}</p>
                  <p><b style={{color:"#d4af37"}}>Offer Name:</b> {candidate.offer_name || "Not selected"}</p>
                  <p><b style={{color:"#d4af37"}}>English:</b> {candidate.english_level}</p>
                  <p><b style={{color:"#d4af37"}}>Location:</b> {candidate.location}</p>
                  <p><b style={{color:"#d4af37"}}>Graduation:</b> {candidate.graduation_status}</p>
                  <p><b style={{color:"#d4af37"}}>Work Type:</b> {candidate.work_type}</p>
                </div>

                <p style={{
                  color: "#d4af37",
                  marginTop: "12px",
                  fontSize: "13px"
                }}>
                  Added By: {candidate.recruiter_name || "Not recorded"}
                </p>

                {canManageCandidates && (
                  <button
                    type="button"
                    onClick={() => startEditing(candidate)}
                    style={{
                      marginTop: "16px",
                      marginRight: "10px",
                      background: "linear-gradient(110deg,#8c691b,#f5dc85,#b68b25)",
                      color: "#080808",
                      border: "1px solid #f5dc85",
                      borderRadius: "8px",
                      padding: "11px 16px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    EDIT CANDIDATE
                  </button>
                )}

                {role === "CEO" && (
                  <button
                    type="button"
                    onClick={() => deleteCandidate(candidate)}
                    disabled={deletingId === candidate.id}
                    style={{
                      marginTop: "16px",
                      background: "linear-gradient(110deg,#7f2020,#c03939)",
                      color: "#fff",
                      border: "1px solid #e05252",
                      borderRadius: "8px",
                      padding: "11px 16px",
                      fontWeight: "bold",
                      cursor: deletingId === candidate.id ? "not-allowed" : "pointer",
                      opacity: deletingId === candidate.id ? 0.6 : 1
                    }}
                  >
                    {deletingId === candidate.id
                      ? "DELETING..."
                      : "DELETE CANDIDATE"}
                  </button>
                )}
              </article>
            ))
          )}
        </section>

        <footer style={{
          textAlign: "center",
          color: "#777",
          fontSize: "11px",
          letterSpacing: "2px",
          marginTop: "45px",
          padding: "20px"
        }}>
          BLACK SCORPIONS © 2026
        </footer>
      </div>
    </main>
  );
}

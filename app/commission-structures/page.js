
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function CommissionStructures() {
  const [supabase] = useState(() => createClient());
  const [entries, setEntries] = useState([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState({
    offer_name: "",
    recruiter_commission: "",
    team_leader_commission: "",
    founder_commission: "",
  });
  const [message, setMessage] = useState("");

  const isCEO = role === "CEO";

  function calculateTotal(entry) {
    return (
      (Number(entry.recruiter_commission) || 0) +
      (Number(entry.team_leader_commission) || 0) +
      (Number(entry.founder_commission) || 0)
    );
  }

  function formatMoney(amount) {
    return `${amount.toLocaleString("en-US")} EGP`;
  }

  async function loadEntries() {
    setLoading(true);
    setMessage("");

    const { data: roleData, error: roleError } =
      await supabase.rpc("current_user_role");

    if (roleError) {
      setMessage("Could not load your account permissions.");
      setLoading(false);
      return;
    }

    setRole(roleData || "");

    const { data, error } = await supabase
      .from("commission_entries")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
    } else {
      setEntries(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, [supabase]);

  function updateEntry(id, field, value) {
    setEntries((previous) =>
      previous.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  }

  async function addEntry() {
    if (!newEntry.offer_name.trim()) {
      setMessage("Please enter the offer name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("commission_entries")
      .insert({
        offer_name: newEntry.offer_name.trim(),
        recruiter_commission: Number(newEntry.recruiter_commission) || 0,
        team_leader_commission: Number(newEntry.team_leader_commission) || 0,
        founder_commission: Number(newEntry.founder_commission) || 0,
      });

    if (error) {
      setMessage(error.message);
    } else {
      setNewEntry({
        offer_name: "",
        recruiter_commission: "",
        team_leader_commission: "",
        founder_commission: "",
      });
      setMessage("Offer added successfully!");
      await loadEntries();
    }

    setSaving(false);
  }

  async function saveEntry(entry) {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("commission_entries")
      .update({
        offer_name: entry.offer_name.trim(),
        recruiter_commission: Number(entry.recruiter_commission) || 0,
        team_leader_commission: Number(entry.team_leader_commission) || 0,
        founder_commission: Number(entry.founder_commission) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Changes saved successfully!");
      await loadEntries();
    }

    setSaving(false);
  }

  async function deleteEntry(id) {
    if (!window.confirm("Are you sure you want to delete this offer?")) {
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("commission_entries")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Offer deleted successfully!");
      await loadEntries();
    }

    setSaving(false);
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    background: "#171717",
    color: "#fff",
    border: "1px solid #454545",
    borderRadius: "8px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "14px",
  };

  const goldButton = {
    background: "#d4a72c",
    color: "#111",
    border: "none",
    borderRadius: "8px",
    padding: "11px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  };

  const cardStyle = {
    background: "#171717",
    border: "1px solid #383838",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "14px",
  };

  const totalStyle = {
    background: "#292313",
    border: "1px solid #d4a72c",
    borderRadius: "10px",
    padding: "14px",
    textAlign: "center",
  };

  if (loading) {
    return (
      <main style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#d4a72c",
        display: "grid",
        placeItems: "center",
        fontSize: "18px",
      }}>
        Loading commission structures...
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#fff",
      padding: "24px 16px",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ maxWidth: "1100px", margin: "auto" }}>

        <header style={{ marginBottom: "28px" }}>
          <div style={{
            color: "#d4a72c",
            fontSize: "13px",
            letterSpacing: "3px",
            fontWeight: "bold",
          }}>
            BLACK SCORPIONS
          </div>

          <h1 style={{
            color: "#d4a72c",
            fontSize: "30px",
            margin: "10px 0",
          }}>
            🦂 Commission Structure
          </h1>

          <p style={{ color: "#aaa", margin: 0 }}>
            Offer commission management
          </p>

          <div style={{
            marginTop: "14px",
            display: "inline-block",
            padding: "7px 12px",
            borderRadius: "20px",
            background: "#252016",
            color: "#d4a72c",
            fontSize: "13px",
          }}>
            {isCEO ? "CEO ACCESS — FULL CONTROL" : `${role || "MEMBER"} — VIEW ONLY`}
          </div>
        </header>

        {message && (
          <div style={{
            padding: "12px",
            marginBottom: "18px",
            borderRadius: "8px",
            background: "#252016",
            color: "#e5bd55",
            border: "1px solid #66501e",
          }}>
            {message}
          </div>
        )}

        {isCEO && (
          <section style={cardStyle}>
            <h2 style={{ color: "#d4a72c", marginTop: 0 }}>
              + Add New Offer
            </h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}>
              <input
                style={inputStyle}
                placeholder="Offer Name"
                value={newEntry.offer_name}
                onChange={(e) => setNewEntry({
                  ...newEntry,
                  offer_name: e.target.value,
                })}
              />

              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder="Recruiter Commission"
                value={newEntry.recruiter_commission}
                onChange={(e) => setNewEntry({
                  ...newEntry,
                  recruiter_commission: e.target.value,
                })}
              />

              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder="Team Leader Commission"
                value={newEntry.team_leader_commission}
                onChange={(e) => setNewEntry({
                  ...newEntry,
                  team_leader_commission: e.target.value,
                })}
              />

              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder="Founder Commission"
                value={newEntry.founder_commission}
                onChange={(e) => setNewEntry({
                  ...newEntry,
                  founder_commission: e.target.value,
                })}
              />
            </div>

            <div style={{ ...totalStyle, marginTop: "14px" }}>
              <div style={{ color: "#aaa", fontSize: "12px" }}>
                TOTAL COMMISSION
              </div>
              <strong style={{
                color: "#d4a72c",
                fontSize: "23px",
                display: "block",
                marginTop: "5px",
              }}>
                {formatMoney(calculateTotal(newEntry))}
              </strong>
            </div>

            <button
              onClick={addEntry}
              disabled={saving}
              style={{
                ...goldButton,
                marginTop: "14px",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "+ Add Offer"}
            </button>
          </section>
        )}

        <section>
          <h2 style={{ color: "#d4a72c", marginBottom: "16px" }}>
            Offers & Commissions ({entries.length})
          </h2>

          {entries.length === 0 ? (
            <div style={{
              ...cardStyle,
              textAlign: "center",
              color: "#999",
              padding: "35px 15px",
            }}>
              No offers added yet.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} style={cardStyle}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                }}>
                  <div>
                    <label style={{ color: "#d4a72c", fontSize: "12px" }}>
                      OFFER NAME
                    </label>
                    <input
                      style={inputStyle}
                      value={entry.offer_name}
                      readOnly={!isCEO}
                      onChange={(e) => updateEntry(
                        entry.id, "offer_name", e.target.value
                      )}
                    />
                  </div>

                  <div>
                    <label style={{ color: "#d4a72c", fontSize: "12px" }}>
                      RECRUITER
                    </label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      value={entry.recruiter_commission}
                      readOnly={!isCEO}
                      onChange={(e) => updateEntry(
                        entry.id, "recruiter_commission", e.target.value
                      )}
                    />
                  </div>

                  <div>
                    <label style={{ color: "#d4a72c", fontSize: "12px" }}>
                      TEAM LEADER
                    </label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      value={entry.team_leader_commission}
                      readOnly={!isCEO}
                      onChange={(e) => updateEntry(
                        entry.id, "team_leader_commission", e.target.value
                      )}
                    />
                  </div>

                  <div>
                    <label style={{ color: "#d4a72c", fontSize: "12px" }}>
                      FOUNDER
                    </label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      value={entry.founder_commission}
                      readOnly={!isCEO}
                      onChange={(e) => updateEntry(
                        entry.id, "founder_commission", e.target.value
                      )}
                    />
                  </div>
                </div>

                <div style={{ ...totalStyle, marginTop: "14px" }}>
                  <div style={{ color: "#aaa", fontSize: "12px" }}>
                    TOTAL COMMISSION
                  </div>
                  <strong style={{
                    color: "#d4a72c",
                    fontSize: "23px",
                    display: "block",
                    marginTop: "5px",
                  }}>
                    {formatMoney(calculateTotal(entry))}
                  </strong>
                </div>

                {isCEO && (
                  <div style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "14px",
                    flexWrap: "wrap",
                  }}>
                    <button
                      onClick={() => saveEntry(entry)}
                      disabled={saving}
                      style={goldButton}
                    >
                      Save Changes
                    </button>

                    <button
                      onClick={() => deleteEntry(entry.id)}
                      disabled={saving}
                      style={{
                        background: "#401919",
                        color: "#ff7777",
                        border: "1px solid #773333",
                        borderRadius: "8px",
                        padding: "11px 18px",
                        cursor: "pointer",
                      }}
                    >
                      Delete Offer
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        <footer style={{
          textAlign: "center",
          color: "#666",
          borderTop: "1px solid #292929",
          marginTop: "35px",
          paddingTop: "20px",
          fontSize: "12px",
        }}>
          BLACK SCORPIONS © 2026
        </footer>

      </div>
    </main>
  );
}

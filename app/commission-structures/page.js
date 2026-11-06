
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
    padding: "13px 14px",
    background: "rgba(7,7,7,0.9)",
    color: "#fff",
    border: "1px solid rgba(212,175,55,0.4)",
    borderRadius: "9px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "14px",
    colorScheme: "dark",
  };

  const labelStyle = {
    display: "block",
    color: "#d4af37",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1px",
    marginBottom: "8px",
  };

  const cardStyle = {
    background: "linear-gradient(145deg, rgba(25,25,25,0.97), rgba(11,11,11,0.97))",
    border: "1px solid rgba(212,175,55,0.32)",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "17px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
  };

  const totalStyle = {
    background: "linear-gradient(135deg, #241e0e, #17130a)",
    border: "1px solid rgba(212,175,55,0.65)",
    borderRadius: "11px",
    padding: "16px",
    textAlign: "center",
  };

  const goldButton = {
    background: "linear-gradient(135deg, #b38b25, #f0d778, #b38b25)",
    color: "#100d05",
    border: "1px solid #f4dc88",
    borderRadius: "8px",
    padding: "12px 19px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "13px",
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.goldLine}></div>
          <h2 style={styles.heading}>Loading Commission Structure...</h2>
          <p style={{ color: "#999" }}>BLACK SCORPIONS HQ</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.glowOne}></div>
      <div style={styles.glowTwo}></div>

      <div style={styles.content}>
        <header style={styles.header}>
          <div style={styles.brandLine}>
            <span style={{ fontSize: "27px" }}>🦂</span>
            <span style={styles.brandName}>BLACK SCORPIONS</span>
          </div>

          <h1 style={styles.title}>Commission Structure</h1>

          <p style={styles.subtitle}>
            Offer commission management
          </p>

          <div style={styles.accessBadge}>
            {isCEO
              ? "♛ CEO ACCESS — FULL CONTROL"
              : `${role || "MEMBER"} — VIEW ONLY`}
          </div>

          <div style={styles.goldLine}></div>
        </header>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {isCEO && (
          <section style={cardStyle}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.eyebrow}>OFFER MANAGEMENT</span>
                <h2 style={styles.heading}>+ Add New Offer</h2>
              </div>
              <span style={styles.headerIcon}>✦</span>
            </div>

            <div style={styles.inputGrid}>
              <div>
                <label style={labelStyle}>OFFER NAME</label>
                <input
                  style={inputStyle}
                  placeholder="Enter Offer Name"
                  value={newEntry.offer_name}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      offer_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>RECRUITER COMMISSION</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  placeholder="0 EGP"
                  value={newEntry.recruiter_commission}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      recruiter_commission: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>TEAM LEADER COMMISSION</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  placeholder="0 EGP"
                  value={newEntry.team_leader_commission}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      team_leader_commission: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>FOUNDER COMMISSION</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  placeholder="0 EGP"
                  value={newEntry.founder_commission}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      founder_commission: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div style={{ ...totalStyle, marginTop: "18px" }}>
              <div style={styles.totalLabel}>TOTAL COMMISSION</div>
              <strong style={styles.totalAmount}>
                {formatMoney(calculateTotal(newEntry))}
              </strong>
            </div>

            <button
              onClick={addEntry}
              disabled={saving}
              style={{
                ...goldButton,
                width: "100%",
                marginTop: "17px",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "+ Add Offer"}
            </button>
          </section>
        )}

        <section>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.eyebrow}>COMMISSION DATABASE</span>
              <h2 style={styles.heading}>
                Offers & Commissions
              </h2>
            </div>

            <div style={styles.countBadge}>{entries.length}</div>
          </div>

          {entries.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: "38px" }}>🦂</div>
              <p>No offers added yet.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} style={cardStyle}>
                <div style={styles.offerHeader}>
                  <span style={styles.offerIcon}>✦</span>
                  <span style={styles.offerTitle}>
                    {entry.offer_name || "Unnamed Offer"}
                  </span>
                </div>

                <div style={styles.inputGrid}>
                  <div>
                    <label style={labelStyle}>OFFER NAME</label>
                    <input
                      style={inputStyle}
                      value={entry.offer_name}
                      readOnly={!isCEO}
                      onChange={(e) =>
                        updateEntry(
                          entry.id,
                          "offer_name",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>RECRUITER</label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      value={entry.recruiter_commission}
                      readOnly={!isCEO}
                      onChange={(e) =>
                        updateEntry(
                          entry.id,
                          "recruiter_commission",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>TEAM LEADER</label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      value={entry.team_leader_commission}
                      readOnly={!isCEO}
                      onChange={(e) =>
                        updateEntry(
                          entry.id,
                          "team_leader_commission",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>FOUNDER</label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      value={entry.founder_commission}
                      readOnly={!isCEO}
                      onChange={(e) =>
                        updateEntry(
                          entry.id,
                          "founder_commission",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div style={{ ...totalStyle, marginTop: "18px" }}>
                  <div style={styles.totalLabel}>TOTAL COMMISSION</div>
                  <strong style={styles.totalAmount}>
                    {formatMoney(calculateTotal(entry))}
                  </strong>
                </div>

                {isCEO && (
                  <div style={styles.actions}>
                    <button
                      onClick={() => saveEntry(entry)}
                      disabled={saving}
                      style={{
                        ...goldButton,
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      Save Changes
                    </button>

                    <button
                      onClick={() => deleteEntry(entry.id)}
                      disabled={saving}
                      style={styles.deleteButton}
                    >
                      Delete Offer
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        <footer style={styles.footer}>
          🦂 BLACK SCORPIONS RECRUITMENT AGENCY
        </footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background: "radial-gradient(ellipse at 50% 0%, #29200d 0%, #111 38%, #050505 100%)",
    color: "#fff",
    padding: "28px 18px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  content: {
    position: "relative",
    zIndex: 2,
    maxWidth: "1100px",
    margin: "0 auto",
  },

  glowOne: {
    position: "absolute",
    top: "-150px",
    right: "-100px",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(212,175,55,0.09)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "absolute",
    top: "650px",
    left: "-150px",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "rgba(130,130,130,0.07)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },

  header: {
    marginBottom: "28px",
    padding: "15px 5px",
  },

  brandLine: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "18px",
  },

  brandName: {
    color: "#d4af37",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "3px",
  },

  title: {
    color: "#e5c45b",
    fontSize: "clamp(29px, 5vw, 43px)",
    margin: "0 0 10px",
    fontWeight: "800",
    textShadow: "0 0 25px rgba(212,175,55,0.18)",
  },

  subtitle: {
    color: "#aaa",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  accessBadge: {
    display: "inline-block",
    padding: "9px 13px",
    borderRadius: "8px",
    background: "rgba(212,175,55,0.1)",
    color: "#e5c45b",
    border: "1px solid rgba(212,175,55,0.4)",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "0.7px",
    marginTop: "12px",
  },

  goldLine: {
    width: "75px",
    height: "3px",
    borderRadius: "5px",
    background: "linear-gradient(90deg, #80621c, #f4d778)",
    marginTop: "20px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  eyebrow: {
    display: "block",
    color: "#9c8135",
    fontSize: "10px",
    letterSpacing: "2px",
    fontWeight: "bold",
    marginBottom: "7px",
  },

  heading: {
    color: "#e2c15b",
    fontSize: "21px",
    margin: 0,
    fontWeight: "700",
  },

  headerIcon: {
    color: "#d4af37",
    fontSize: "27px",
  },

  inputGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
  },

  totalLabel: {
    color: "#aaa",
    fontSize: "11px",
    letterSpacing: "2px",
  },

  totalAmount: {
    color: "#e5c45b",
    fontSize: "25px",
    display: "block",
    marginTop: "7px",
  },

  countBadge: {
    minWidth: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(212,175,55,0.12)",
    border: "1px solid rgba(212,175,55,0.4)",
    borderRadius: "10px",
    color: "#e5c45b",
    fontWeight: "bold",
  },

  offerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "19px",
  },

  offerIcon: {
    color: "#d4af37",
    fontSize: "21px",
  },

  offerTitle: {
    color: "#e5c45b",
    fontSize: "17px",
    fontWeight: "bold",
  },

  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
    flexWrap: "wrap",
  },

  deleteButton: {
    background: "rgba(127,29,29,0.25)",
    color: "#ff8585",
    border: "1px solid rgba(239,68,68,0.5)",
    borderRadius: "8px",
    padding: "12px 19px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  message: {
    padding: "14px 16px",
    marginBottom: "18px",
    borderRadius: "9px",
    background: "rgba(212,175,55,0.1)",
    color: "#e5c45b",
    border: "1px solid rgba(212,175,55,0.35)",
    fontSize: "14px",
  },

  emptyState: {
    textAlign: "center",
    padding: "35px 15px",
    background: "rgba(20,20,20,0.8)",
    border: "1px dashed rgba(212,175,55,0.3)",
    borderRadius: "12px",
    color: "#999",
  },

  loadingCard: {
    maxWidth: "450px",
    margin: "100px auto",
    textAlign: "center",
    padding: "30px",
    background: "#141414",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "15px",
  },

  footer: {
    textAlign: "center",
    color: "#76652f",
    fontSize: "10px",
    letterSpacing: "2px",
    marginTop: "45px",
    padding: "20px 5px",
    borderTop: "1px solid rgba(212,175,55,0.15)",
  },
};

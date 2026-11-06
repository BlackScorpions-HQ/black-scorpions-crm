
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

const experienceOptions = [
  "No Experience",
  "1 Year",
  "1–2 Years",
  "2–3 Years",
  "+3 Years",
];

const graduationOptions = [
  "Graduate",
  "Undergraduate",
  "Gap Year",
  "Dropout",
  "All of Them",
];

const emptySearch = {
  age: "",
  job_type: "",
  graduation_status: "",
  required_language: "",
  experience: "",
  nationality: "",
};

const emptyJob = {
  title: "",
  company_name: "",
  maximum_age: "",
  required_language: "",
  location: "",
  job_description: "",
  job_type: "",
  graduation_status: "",
  experience: "",
  nationality: "Both",
  status: "Active",
};

function getLanguageLevel(language) {
  const value = (language || "").trim().toLowerCase();
  const match = value.match(/^(.*?)\s+(a1|a2|b1|b2|c1|c2)$/i);

  if (!match) return null;

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

  return {
    language: match[1].trim(),
    level: levels.indexOf(match[2].toUpperCase()),
  };
}

function languageMatches(candidateLanguage, requiredLanguage) {
  const candidate = getLanguageLevel(candidateLanguage);
  const required = getLanguageLevel(requiredLanguage);

  if (candidate && required) {
    return (
      candidate.language === required.language &&
      candidate.level >= required.level
    );
  }

  return (
    (candidateLanguage || "").trim().toLowerCase() ===
    (requiredLanguage || "").trim().toLowerCase()
  );
}

export default function JobOffersPage() {
  const [supabase] = useState(() => createClient());
  const [role, setRole] = useState("");
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState(emptySearch);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [job, setJob] = useState(emptyJob);

  const isCEO = role === "CEO";

  async function loadOffers() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    if (!currentUser) {
      setMessage("Please log in first.");
      setLoading(false);
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (roleError) {
      setMessage(roleError.message);
      setLoading(false);
      return;
    }

    setRole(roleData.role);

    const { data, error } = await supabase
      .from("job_offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setOffers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOffers();
  }, [supabase]);

  function updateJob(field, value) {
    setJob((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateSearch(field, value) {
    setSearch((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function copyOffer(offer) {
    try {
      const description = offer.job_description || "";

      if (!description.trim()) {
        setMessage("This offer has no description to copy.");
        return;
      }

      await navigator.clipboard.writeText(description);
      setMessage("Offer description copied successfully! ✅");
    } catch (error) {
      setMessage("Copy failed. Please try again.");
    }
  }

  async function addJob(event) {
    event.preventDefault();
    setMessage("");

    if (
      !job.title.trim() ||
      !job.company_name.trim() ||
      !job.maximum_age ||
      !job.required_language.trim() ||
      !job.location.trim() ||
      !job.job_description.trim()
    ) {
      setMessage("Please complete all required job fields.");
      return;
    }

    if (Number(job.maximum_age) < 18) {
      setMessage("Maximum age cannot be below 18.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("job_offers")
      .insert({
        title: job.title.trim(),
        company: "Black Scorpions",
        company_name: job.company_name.trim(),
        maximum_age: Number(job.maximum_age),
        required_language: job.required_language.trim(),
        location: job.location.trim(),
        job_description: job.job_description.trim(),
        job_type: job.job_type || null,
        graduation_status: job.graduation_status || null,
        experience: job.experience || null,
        nationality: job.nationality || "Both",
        status: job.status,
      });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Job offer published successfully!");
      setJob({ ...emptyJob });
      await loadOffers();
    }

    setSaving(false);
  }

  async function changeJobStatus(offerId, newStatus) {
    if (!isCEO) return;

    setMessage("");
    setChangingStatus(offerId);

    const { error } = await supabase
      .from("job_offers")
      .update({ status: newStatus })
      .eq("id", offerId);

    if (error) {
      setMessage("Status update failed: " + error.message);
    } else {
      setOffers((previous) =>
        previous.map((offer) =>
          offer.id === offerId
            ? { ...offer, status: newStatus }
            : offer
        )
      );

      setMessage(
        newStatus === "Active"
          ? "Job activated successfully!"
          : "Job placed on Hold successfully!"
      );

      setResults(null);
    }

    setChangingStatus(null);
  }

  function findMatches(event) {
    event.preventDefault();
    setMessage("");
    setResults(null);

    const age = Number(search.age);

    if (!search.age || !Number.isFinite(age) || age < 18) {
      setMessage("Candidates must be at least 18 years old.");
      return;
    }

    if (
      !search.job_type ||
      !search.graduation_status ||
      !search.required_language.trim() ||
      !search.experience ||
      !search.nationality
    ) {
      setMessage("Please complete all search fields.");
      return;
    }

    const experienceRank = {
      "No Experience": 0,
      "1 Year": 1,
      "1–2 Years": 2,
      "2–3 Years": 3,
      "+3 Years": 4,
    };

    const matches = offers.filter((offer) => {
      if (offer.status !== "Active") return false;

      if (age > Number(offer.maximum_age)) return false;

      if (
        !languageMatches(
          search.required_language,
          offer.required_language
        )
      ) return false;

      if (offer.job_type && offer.job_type !== search.job_type) {
        return false;
      }

      if (
        offer.graduation_status &&
        offer.graduation_status !== "All of Them" &&
        offer.graduation_status !== search.graduation_status
      ) return false;

      if (
        offer.experience &&
        experienceRank[search.experience] <
        experienceRank[offer.experience]
      ) return false;

      if (
        offer.nationality &&
        offer.nationality !== "Both" &&
        offer.nationality !== search.nationality
      ) return false;

      return true;
    });

    setResults(matches);
  }

  const activeOffers = offers.filter(
    (offer) => offer.status === "Active"
  );

  const visibleOffers = isCEO ? offers : activeOffers;

  const inputStyle = {
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid #393939",
    background: "#111",
    color: "#fff",
    marginTop: "8px",
    marginBottom: "19px",
    boxSizing: "border-box",
    fontSize: "14px",
  };

  const labelStyle = {
    color: "#d4af37",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1.3px",
    display: "block",
  };

  const buttonStyle = {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #f0d477, #b58b24)",
    color: "#090909",
    fontWeight: "900",
    fontSize: "13px",
    letterSpacing: "1px",
    cursor: "pointer",
    transition: "0.2s",
  };

  const sectionStyle = {
    background: "linear-gradient(145deg, #1c1c1c, #090909)",
    border: "1px solid rgba(212,175,55,0.55)",
    borderRadius: "16px",
    padding: "22px",
    marginBottom: "28px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
  };

  function field(label, value, onChange, placeholder = "", type = "text") {
    return (
      <label style={labelStyle}>
        {label}
        <input
          style={inputStyle}
          type={type}
          value={value}
          placeholder={placeholder}
          min={type === "number" ? 18 : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  function dropdown(label, value, onChange, options, placeholder) {
    return (
      <label style={labelStyle}>
        {label}
        <select
          style={inputStyle}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {placeholder || "Select..."}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={option}
              style={{ background: "#111", color: "#fff" }}
            >
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function offerCard(offer) {
    const isActive = offer.status === "Active";

    return (
      <div
        key={offer.id}
        style={{
          background: "linear-gradient(145deg, #191919, #0b0b0b)",
          border: "1px solid rgba(212,175,55,0.45)",
          borderRadius: "13px",
          padding: "20px",
          marginBottom: "15px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          borderBottom: "1px solid #333",
          paddingBottom: "12px",
          marginBottom: "15px",
        }}>
          <h3 style={{
            color: "#e9c45b",
            margin: 0,
            fontSize: "19px",
          }}>
            {offer.title}
          </h3>

          <span style={{
            color: isActive ? "#65d69a" : "#ff7777",
            fontWeight: "bold",
            background: isActive ? "#10251a" : "#2b1111",
            border: `1px solid ${isActive ? "#28623e" : "#702d2d"}`,
            padding: "7px 12px",
            borderRadius: "20px",
            fontSize: "11px",
          }}>
            {isActive ? "ACTIVE" : "ON HOLD"}
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "12px",
          color: "#ccc",
          fontSize: "13px",
        }}>
          <p><b style={{ color: "#d4af37" }}>Company:</b> {offer.company_name || "Not specified"}</p>
          <p><b style={{ color: "#d4af37" }}>Location:</b> {offer.location}</p>
          <p><b style={{ color: "#d4af37" }}>Language:</b> {offer.required_language}</p>
          <p><b style={{ color: "#d4af37" }}>Maximum Age:</b> {offer.maximum_age}</p>
          <p><b style={{ color: "#d4af37" }}>Job Type:</b> {offer.job_type || "Any"}</p>
          <p><b style={{ color: "#d4af37" }}>Graduation:</b> {offer.graduation_status || "Any"}</p>
          <p><b style={{ color: "#d4af37" }}>Experience:</b> {offer.experience || "Any"}</p>
          <p><b style={{ color: "#d4af37" }}>Nationality:</b> {offer.nationality || "Both"}</p>
        </div>

        <div style={{
          background: "#101010",
          border: "1px solid #292929",
          borderRadius: "9px",
          padding: "14px",
          marginTop: "12px",
          color: "#ccc",
          fontSize: "13px",
          lineHeight: "1.7",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}>
          {offer.job_description}
        </div>

        <button
          type="button"
          onClick={() => copyOffer(offer)}
          style={{
            ...buttonStyle,
            marginTop: "15px",
          }}
        >
          📋 Copy Offer
        </button>

        {isCEO && (
          <button
            type="button"
            disabled={changingStatus === offer.id}
            onClick={() =>
              changeJobStatus(
                offer.id,
                isActive ? "Hold" : "Active"
              )
            }
            style={{
              ...buttonStyle,
              background: isActive
                ? "linear-gradient(135deg, #9d3434, #651d1d)"
                : "linear-gradient(135deg, #238b4e, #14562e)",
              color: "#fff",
              marginTop: "10px",
              opacity: changingStatus === offer.id ? 0.6 : 1,
            }}
          >
            {changingStatus === offer.id
              ? "Updating..."
              : isActive
                ? "PUT ON HOLD"
                : "ACTIVATE JOB"}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main style={{
        ...pageStyle,
        color: "#e9c45b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={loadingStyle}>
          🦂 LOADING JOB OFFERS...
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={smokeOneStyle}></div>
      <div style={smokeTwoStyle}></div>

      <div style={{
        maxWidth: "900px",
        margin: "auto",
        position: "relative",
        zIndex: 1,
      }}>
        <header style={{
          textAlign: "center",
          marginBottom: "32px",
          paddingTop: "12px",
        }}>
          <div style={logoCircleStyle}>🦂</div>

          <h1 style={{
            color: "#d4af37",
            fontSize: "29px",
            fontWeight: "900",
            letterSpacing: "2px",
            margin: "12px 0",
          }}>
            JOB OFFERS
          </h1>

          <div style={goldLineStyle}></div>

          <p style={{
            color: "#999",
            fontSize: "11px",
            letterSpacing: "3px",
          }}>
            BLACK SCORPIONS | SMART JOB MATCHING
          </p>
        </header>

        {message && (
          <div style={{
            background: "rgba(212,175,55,0.08)",
            border: "1px solid rgba(212,175,55,0.5)",
            color: "#f2d477",
            padding: "14px",
            borderRadius: "9px",
            marginBottom: "20px",
            fontSize: "13px",
            lineHeight: "1.5",
          }}>
            {message}
          </div>
        )}

        {isCEO && (
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              + PUBLISH NEW JOB
            </h2>

            <p style={sectionSubtitleStyle}>
              Create and publish a new job offer
            </p>

            <form onSubmit={addJob}>
              {field(
                "JOB TITLE *",
                job.title,
                (v) => updateJob("title", v),
                "Job title"
              )}

              {field(
                "COMPANY NAME *",
                job.company_name,
                (v) => updateJob("company_name", v),
                "Enter company name"
              )}

              {field(
                "MAXIMUM AGE *",
                job.maximum_age,
                (v) => updateJob("maximum_age", v),
                "18+",
                "number"
              )}

              {field(
                "LANGUAGE *",
                job.required_language,
                (v) => updateJob("required_language", v),
                "Example: English B2"
              )}

              {field(
                "LOCATION *",
                job.location,
                (v) => updateJob("location", v),
                "Example: Maadi"
              )}

              {dropdown(
                "JOB TYPE",
                job.job_type,
                (v) => updateJob("job_type", v),
                ["WFS", "WFH"],
                "Any"
              )}

              {dropdown(
                "GRADUATION STATUS",
                job.graduation_status,
                (v) => updateJob("graduation_status", v),
                graduationOptions,
                "Any"
              )}

              {dropdown(
                "EXPERIENCE",
                job.experience,
                (v) => updateJob("experience", v),
                experienceOptions,
                "Any"
              )}

              {dropdown(
                "NATIONALITY",
                job.nationality,
                (v) => updateJob("nationality", v),
                ["Both", "Egyptian", "Foreigner"]
              )}

              {dropdown(
                "JOB STATUS *",
                job.status,
                (v) => updateJob("status", v),
                ["Active", "Hold"]
              )}

              <label style={labelStyle}>
                JOB DESCRIPTION *
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "130px",
                    resize: "vertical",
                  }}
                  value={job.job_description}
                  onChange={(e) =>
                    updateJob("job_description", e.target.value)
                  }
                  placeholder="Write job details..."
                />
              </label>

              <button
                style={{
                  ...buttonStyle,
                  marginTop: "8px",
                }}
                disabled={saving}
              >
                {saving ? "PUBLISHING..." : "PUBLISH JOB OFFER"}
              </button>
            </form>
          </section>
        )}

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            SMART JOB MATCHING
          </h2>

          <p style={sectionSubtitleStyle}>
            Find suitable active jobs using candidate details
          </p>

          <form onSubmit={findMatches}>
            {field(
              "CANDIDATE AGE *",
              search.age,
              (v) => updateSearch("age", v),
              "Minimum 18",
              "number"
            )}

            {dropdown(
              "JOB TYPE *",
              search.job_type,
              (v) => updateSearch("job_type", v),
              ["WFS", "WFH"]
            )}

            {dropdown(
              "GRADUATION STATUS *",
              search.graduation_status,
              (v) => updateSearch("graduation_status", v),
              graduationOptions.filter(
                (option) => option !== "All of Them"
              )
            )}

            {field(
              "LANGUAGE *",
              search.required_language,
              (v) => updateSearch("required_language", v),
              "Example: English B2"
            )}

            {dropdown(
              "EXPERIENCE *",
              search.experience,
              (v) => updateSearch("experience", v),
              experienceOptions
            )}

            {dropdown(
              "NATIONALITY *",
              search.nationality,
              (v) => updateSearch("nationality", v),
              ["Egyptian", "Foreigner"]
            )}

            <button style={buttonStyle}>
              FIND MATCHING JOBS
            </button>
          </form>

          {results !== null && (
            <div style={{ marginTop: "25px" }}>
              <div style={{
                borderTop: "1px solid #393020",
                paddingTop: "18px",
                marginBottom: "18px",
              }}>
                <h3 style={{ color: "#e9c45b" }}>
                  MATCHING RESULTS: {results.length}
                </h3>
              </div>

              {results.length === 0 ? (
                <p style={{ color: "#ccc" }}>
                  No matching jobs found.
                </p>
              ) : (
                results.map(offerCard)
              )}
            </div>
          )}
        </section>

        <section style={{ marginBottom: "35px" }}>
          <h2 style={sectionTitleStyle}>
            {isCEO ? "ALL JOB OFFERS" : "ACTIVE JOB OFFERS"}
          </h2>

          <p style={sectionSubtitleStyle}>
            {visibleOffers.length} offers available
          </p>

          {visibleOffers.length === 0 ? (
            <div style={{
              ...sectionStyle,
              color: "#aaa",
              textAlign: "center",
            }}>
              No job offers found.
            </div>
          ) : (
            visibleOffers.map(offerCard)
          )}
        </section>

        <footer style={footerStyle}>
          <p>BLACK SCORPIONS © 2026</p>
          <span>POWER • DISCIPLINE • SUCCESS</span>
        </footer>
      </div>

      <style jsx>{`
        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: #d4af37 !important;
          box-shadow: 0 0 12px rgba(212,175,55,0.15);
        }

        button:hover:not(:disabled) {
          filter: brightness(1.12);
          transform: translateY(-2px);
        }

        button:disabled {
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          main {
            padding: 16px !important;
          }
        }
      `}</style>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(ellipse at 50% 35%, #242016 0%, #101010 42%, #050505 100%)",
  color: "#fff",
  padding: "25px 18px",
  fontFamily: "Arial, sans-serif",
  position: "relative",
  overflow: "hidden",
};

const smokeOneStyle = {
  position: "fixed",
  width: "600px",
  height: "600px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(212,175,55,0.09), transparent 70%)",
  top: "-200px",
  left: "-200px",
  filter: "blur(50px)",
  pointerEvents: "none",
};

const smokeTwoStyle = {
  position: "fixed",
  width: "650px",
  height: "650px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(120,120,120,0.12), transparent 70%)",
  bottom: "-300px",
  right: "-200px",
  filter: "blur(60px)",
  pointerEvents: "none",
};

const logoCircleStyle = {
  width: "76px",
  height: "76px",
  border: "1px solid #d4af37",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
  fontSize: "38px",
  background: "linear-gradient(145deg, #292316, #090909)",
  boxShadow: "0 0 25px rgba(212,175,55,0.16)",
};

const goldLineStyle = {
  width: "100px",
  height: "1px",
  background: "#d4af37",
  margin: "15px auto",
};

const sectionTitleStyle = {
  color: "#d4af37",
  fontSize: "19px",
  fontWeight: "900",
  letterSpacing: "1.3px",
  margin: "0 0 10px",
};

const sectionSubtitleStyle = {
  color: "#999",
  fontSize: "13px",
  marginBottom: "22px",
};

const loadingStyle = {
  background: "#151515",
  border: "1px solid #d4af37",
  borderRadius: "12px",
  padding: "25px",
  letterSpacing: "2px",
  fontWeight: "bold",
};

const footerStyle = {
  borderTop: "1px solid #292929",
  marginTop: "30px",
  paddingTop: "20px",
  paddingBottom: "15px",
  textAlign: "center",
  color: "#777",
  fontSize: "10px",
  letterSpacing: "1.5px",
};

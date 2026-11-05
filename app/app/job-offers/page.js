
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

const experienceOptions = [
  "No Experience",
  "1 Year",
  "1-2 Years",
  "2-3 Years",
  "+3 Years"
];

const graduationOptions = [
  "Graduate",
  "Undergraduate",
  "Gap Year",
  "Dropout"
];

const nationalityOptions = [
  "Egyptian",
  "Foreigner"
];

const anyOptions = ["Any", ...experienceOptions];

export default function JobOffers() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("");
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searched, setSearched] = useState(false);
  const [matches, setMatches] = useState([]);

  const [jobForm, setJobForm] = useState({
    title: "",
    maximum_age: "",
    required_language: "",
    location: "",
    job_description: "",
    job_type: "Any",
    graduation_status: "Any",
    experience: "Any",
    nationality: "Both"
  });

  const [searchForm, setSearchForm] = useState({
    age: "",
    job_type: "",
    graduation_status: "",
    language: "",
    experience: "",
    nationality: ""
  });

  useEffect(() => {
    loadOffers();
  }, [supabase]);

  async function loadOffers() {
    setLoading(true);
    setError("");

    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || !profile) {
      setError(roleError?.message || "Unable to identify your role.");
      setLoading(false);
      return;
    }

    setRole(profile.role);

    const { data, error: offersError } = await supabase
      .from("job_offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (offersError) {
      setError(offersError.message);
    } else {
      setOffers(data || []);
    }

    setLoading(false);
  }

  function updateJobForm(e) {
    setJobForm({
      ...jobForm,
      [e.target.name]: e.target.value
    });
  }

  function updateSearchForm(e) {
    setSearchForm({
      ...searchForm,
      [e.target.name]: e.target.value
    });
  }

  async function addOffer(e) {
    e.preventDefault();

    if (role !== "CEO") {
      setError("Only the CEO can publish job offers.");
      return;
    }

    const maxAge = Number(jobForm.maximum_age);

    if (
      !jobForm.title.trim() ||
      !jobForm.maximum_age ||
      !jobForm.required_language.trim() ||
      !jobForm.location.trim() ||
      !jobForm.job_description.trim()
    ) {
      setError("Please complete all five required fields.");
      return;
    }

    if (!Number.isInteger(maxAge) || maxAge < 18) {
      setError("Maximum age must be 18 or older.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const { error: insertError } = await supabase
      .from("job_offers")
      .insert([{
        title: jobForm.title.trim(),
        company: "Black Scorpions",
        maximum_age: maxAge,
        required_language: jobForm.required_language.trim(),
        location: jobForm.location.trim(),
        job_description: jobForm.job_description.trim(),
        job_type: jobForm.job_type,
        graduation_status: jobForm.graduation_status,
        experience: jobForm.experience,
        nationality: jobForm.nationality,
        status: "Active"
      }]);

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess("Job offer published successfully!");
      setJobForm({
        title: "",
        maximum_age: "",
        required_language: "",
        location: "",
        job_description: "",
        job_type: "Any",
        graduation_status: "Any",
        experience: "Any",
        nationality: "Both"
      });
      setSearched(false);
      setMatches([]);
      await loadOffers();
    }

    setSaving(false);
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function experienceLevel(value) {
    const levels = {
      "no experience": 0,
      "1 year": 1,
      "1-2 years": 2,
      "1–2 years": 2,
      "2-3 years": 3,
      "2–3 years": 3,
      "+3 years": 4
    };

    return levels[normalize(value)] ?? -1;
  }

  function searchJobs(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const age = Number(searchForm.age);

    if (!Number.isInteger(age) || age < 18) {
      setError("Age must be 18 or older.");
      setSearched(false);
      setMatches([]);
      return;
    }

    const results = offers.filter((offer) => {
      if (normalize(offer.status) !== "active") return false;

      const maximumAge = Number(offer.maximum_age);

      if (Number.isFinite(maximumAge) && maximumAge > 0 && age > maximumAge) {
        return false;
      }

      if (
        normalize(offer.required_language) !==
        normalize(searchForm.language)
      ) {
        return false;
      }

      const offerType = normalize(offer.job_type);
      if (
        offerType &&
        offerType !== "any" &&
        offerType !== normalize(searchForm.job_type)
      ) {
        return false;
      }

      const offerGraduation = normalize(offer.graduation_status);
      if (
        offerGraduation &&
        offerGraduation !== "any" &&
        offerGraduation !== normalize(searchForm.graduation_status)
      ) {
        return false;
      }

      const offerNationality = normalize(offer.nationality);
      if (
        offerNationality &&
        offerNationality !== "both" &&
        offerNationality !== "any" &&
        offerNationality !== normalize(searchForm.nationality)
      ) {
        return false;
      }

      const requiredExperience = experienceLevel(offer.experience);
      const candidateExperience = experienceLevel(searchForm.experience);

      if (
        requiredExperience >= 0 &&
        candidateExperience < requiredExperience
      ) {
        return false;
      }

      return true;
    });

    setMatches(results);
    setSearched(true);
  }

  const isCEO = role === "CEO";

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <a href="/" style={styles.back}>← Dashboard</a>

        <header style={styles.header}>
          <h1 style={styles.gold}>🦂 JOB OFFERS</h1>
          <p style={styles.muted}>BLACK SCORPIONS RECRUITMENT AGENCY</p>
        </header>

        {loading ? (
          <p style={styles.gold}>Loading...</p>
        ) : (
          <>
            {isCEO && (
              <section style={styles.card}>
                <h2 style={styles.gold}>＋ ADD NEW JOB OFFER</h2>
                <p style={styles.muted}>
                  Complete the five required fields to publish a vacancy.
                </p>

                <form onSubmit={addOffer}>
                  <label style={styles.label}>Job Title *</label>
                  <input
                    name="title"
                    value={jobForm.title}
                    onChange={updateJobForm}
                    placeholder="Customer Service Representative"
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>Maximum Age *</label>
                  <input
                    name="maximum_age"
                    type="number"
                    min="18"
                    step="1"
                    value={jobForm.maximum_age}
                    onChange={updateJobForm}
                    placeholder="Example: 35"
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>Language *</label>
                  <input
                    name="required_language"
                    value={jobForm.required_language}
                    onChange={updateJobForm}
                    placeholder="Example: English B2"
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>Location *</label>
                  <input
                    name="location"
                    value={jobForm.location}
                    onChange={updateJobForm}
                    placeholder="Maadi / Nasr City / WFH"
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>Job Description *</label>
                  <textarea
                    name="job_description"
                    value={jobForm.job_description}
                    onChange={updateJobForm}
                    placeholder="Write all job details and requirements..."
                    style={{ ...styles.input, minHeight: 120 }}
                    required
                  />

                  <h3 style={styles.gold}>
                    OPTIONAL MATCHING REQUIREMENTS
                  </h3>
                  <p style={styles.muted}>
                    Leave these as Any if the job accepts all options.
                  </p>

                  <label style={styles.label}>Job Type</label>
                  <select
                    name="job_type"
                    value={jobForm.job_type}
                    onChange={updateJobForm}
                    style={styles.input}
                  >
                    <option value="Any">Any</option>
                    <option value="WFS">WFS</option>
                    <option value="WFH">WFH</option>
                  </select>

                  <label style={styles.label}>Graduation Status</label>
                  <select
                    name="graduation_status"
                    value={jobForm.graduation_status}
                    onChange={updateJobForm}
                    style={styles.input}
                  >
                    <option value="Any">Any</option>
                    {graduationOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>

                  <label style={styles.label}>Minimum Experience</label>
                  <select
                    name="experience"
                    value={jobForm.experience}
                    onChange={updateJobForm}
                    style={styles.input}
                  >
                    {anyOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>

                  <label style={styles.label}>Nationality</label>
                  <select
                    name="nationality"
                    value={jobForm.nationality}
                    onChange={updateJobForm}
                    style={styles.input}
                  >
                    <option value="Both">Both</option>
                    <option value="Egyptian">Egyptian</option>
                    <option value="Foreigner">Foreigner</option>
                  </select>

                  <button
                    type="submit"
                    disabled={saving}
                    style={styles.goldButton}
                  >
                    {saving ? "PUBLISHING..." : "PUBLISH JOB OFFER"}
                  </button>
                </form>
              </section>
            )}

            <section style={styles.card}>
              <h2 style={styles.gold}>🔎 SEARCH FOR JOBS</h2>
              <p style={styles.muted}>
                Anyone in the company can search for matching vacancies.
              </p>

              <form onSubmit={searchJobs}>
                <label style={styles.label}>Age *</label>
                <input
                  type="number"
                  min="18"
                  step="1"
                  name="age"
                  value={searchForm.age}
                  onChange={updateSearchForm}
                  placeholder="Your age (18+)"
                  style={styles.input}
                  required
                />

                <label style={styles.label}>Job Type *</label>
                <select
                  name="job_type"
                  value={searchForm.job_type}
                  onChange={updateSearchForm}
                  style={styles.input}
                  required
                >
                  <option value="">Select Job Type</option>
                  <option value="WFS">WFS</option>
                  <option value="WFH">WFH</option>
                </select>

                <label style={styles.label}>Graduation Status *</label>
                <select
                  name="graduation_status"
                  value={searchForm.graduation_status}
                  onChange={updateSearchForm}
                  style={styles.input}
                  required
                >
                  <option value="">Select Graduation Status</option>
                  {graduationOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <label style={styles.label}>Language *</label>
                <input
                  name="language"
                  value={searchForm.language}
                  onChange={updateSearchForm}
                  placeholder="Example: English B2"
                  style={styles.input}
                  required
                />

                <label style={styles.label}>Experience *</label>
                <select
                  name="experience"
                  value={searchForm.experience}
                  onChange={updateSearchForm}
                  style={styles.input}
                  required
                >
                  <option value="">Select Experience</option>
                  {experienceOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <label style={styles.label}>Nationality *</label>
                <select
                  name="nationality"
                  value={searchForm.nationality}
                  onChange={updateSearchForm}
                  style={styles.input}
                  required
                >
                  <option value="">Select Nationality</option>
                  {nationalityOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <button type="submit" style={styles.goldButton}>
                  FIND MATCHING JOBS
                </button>
              </form>
            </section>

            {searched && (
              <section style={styles.results}>
                <h2 style={styles.gold}>
                  MATCHING RESULTS ({matches.length})
                </h2>

                {matches.length === 0 ? (
                  <p style={styles.muted}>
                    No matching active jobs found. Try different search details.
                  </p>
                ) : (
                  <div style={styles.offerGrid}>
                    {matches.map((offer) => (
                      <article key={offer.id} style={styles.offerCard}>
                        <span style={styles.active}>● ACTIVE MATCH</span>

                        <h3 style={styles.jobTitle}>{offer.title}</h3>

                        <p style={styles.detail}>
                          <strong>Maximum Age:</strong> {offer.maximum_age ?? "Not specified"}
                        </p>

                        <p style={styles.detail}>
                          <strong>Language:</strong> {offer.required_language}
                        </p>

                        <p style={styles.detail}>
                          <strong>Location:</strong> {offer.location}
                        </p>

                        <p style={styles.detail}>
                          <strong>Job Type:</strong> {offer.job_type || "Any"}
                        </p>

                        <p style={styles.detail}>
                          <strong>Graduation:</strong> {offer.graduation_status || "Any"}
                        </p>

                        <p style={styles.detail}>
                          <strong>Experience:</strong> {offer.experience || "Any"}
                        </p>

                        <p style={styles.detail}>
                          <strong>Nationality:</strong> {offer.nationality || "Both"}
                        </p>

                        <div style={styles.description}>
                          {offer.job_description || "No description provided."}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section style={styles.allOffers}>
              <h2 style={styles.gold}>ALL ACTIVE JOB OFFERS</h2>

              {offers.filter(
                (offer) => normalize(offer.status) === "active"
              ).length === 0 ? (
                <p style={styles.muted}>No active offers yet.</p>
              ) : (
                <div style={styles.offerGrid}>
                  {offers
                    .filter((offer) => normalize(offer.status) === "active")
                    .map((offer) => (
                      <article key={offer.id} style={styles.offerCard}>
                        <span style={styles.active}>● ACTIVE</span>
                        <h3 style={styles.jobTitle}>{offer.title}</h3>
                        <p style={styles.detail}>
                          Language: {offer.required_language}
                        </p>
                        <p style={styles.detail}>
                          Location: {offer.location}
                        </p>
                        <p style={styles.detail}>
                          Maximum Age: {offer.maximum_age ?? "Not specified"}
                        </p>
                      </article>
                    ))}
                </div>
              )}
            </section>
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <button onClick={loadOffers} style={styles.refresh}>
          ↻ REFRESH
        </button>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#080808",
    color: "#fff",
    padding: "25px 16px",
    fontFamily: "Arial, sans-serif"
  },
  container: {
    maxWidth: 950,
    margin: "0 auto"
  },
  back: {
    display: "inline-block",
    color: "#d4af37",
    textDecoration: "none",
    border: "1px solid #d4af37",
    borderRadius: 7,
    padding: "10px 15px"
  },
  header: {
    textAlign: "center",
    margin: "30px 0"
  },
  gold: {
    color: "#d4af37"
  },
  muted: {
    color: "#999",
    lineHeight: 1.6
  },
  card: {
    background: "#171717",
    border: "1px solid #383838",
    borderRadius: 14,
    padding: 22,
    marginBottom: 25
  },
  label: {
    display: "block",
    color: "#d4af37",
    marginTop: 16,
    marginBottom: 7,
    fontSize: 14
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 13,
    background: "#080808",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 7,
    outline: "none"
  },
  goldButton: {
    width: "100%",
    padding: 15,
    marginTop: 22,
    background: "#d4af37",
    color: "#080808",
    border: "none",
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer"
  },
  results: {
    marginTop: 30,
    padding: 20,
    background: "#171717",
    border: "1px solid #d4af37",
    borderRadius: 14
  },
  allOffers: {
    marginTop: 30
  },
  offerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 15,
    marginTop: 18
  },
  offerCard: {
    background: "#171717",
    border: "1px solid #444",
    borderRadius: 12,
    padding: 18
  },
  active: {
    color: "#65d68a",
    fontSize: 12,
    fontWeight: "bold"
  },
  jobTitle: {
    color: "#d4af37",
    fontSize: 19,
    margin: "15px 0"
  },
  detail: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 1.5
  },
  description: {
    marginTop: 15,
    padding: 12,
    background: "#222",
    borderRadius: 8,
    color: "#ddd",
    whiteSpace: "pre-wrap",
    lineHeight: 1.6
  },
  error: {
    color: "#ff7777",
    background: "#241111",
    padding: 12,
    borderRadius: 7,
    marginTop: 20
  },
  success: {
    color: "#65d68a",
    marginTop: 20
  },
  refresh: {
    width: "100%",
    padding: 13,
    marginTop: 25,
    background: "#222",
    color: "#d4af37",
    border: "1px solid #d4af37",
    borderRadius: 8,
    cursor: "pointer"
  }
};

import React, { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000/api";

export default function SyllabusAnalyzer() {
  const [mode, setMode] = useState("upload");

  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  // Load subjects
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const token = localStorage.getItem("aiqpg_token");

      const response = await fetch(`${API}/subjects/`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      if (!response.ok) {
        throw new Error("Unable to load subjects");
      }

      const data = await response.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Subject loading error:", err);
    }
  };

  // Change upload/manual mode
  const changeMode = (newMode) => {
    setMode(newMode);
    setError("");
    setAnalysis(null);
  };

  // Select file
  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setError("");
    setAnalysis(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedExtensions = [".pdf", ".doc", ".docx", ".txt"];

    const fileName = selectedFile.name.toLowerCase();

    const validFile = allowedExtensions.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!validFile) {
      setError("Only PDF, DOC, DOCX and TXT files are supported.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  // Analyze syllabus
  const analyzeSyllabus = async () => {
    setError("");
    setAnalysis(null);

    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter the syllabus name.");
      return;
    }

    if (mode === "upload" && !file) {
      setError("Please select a PDF, DOC, DOCX or TXT file.");
      return;
    }

    if (mode === "manual" && !content.trim()) {
      setError("Please enter the syllabus content.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("aiqpg_token");

      let syllabusId = null;

      // ============================================
      // UPLOAD MODE
      // ============================================
      if (mode === "upload") {
        const formData = new FormData();

        formData.append("file", file);
        formData.append("subject_id", subjectId);
        formData.append("name", name.trim());
        formData.append("description", description.trim());

        const response = await fetch(`${API}/syllabus/upload`, {
          method: "POST",

          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},

          body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to upload syllabus."
          );
        }

        syllabusId = data.syllabus?.id;
      }

      // ============================================
      // MANUAL MODE
      // ============================================
      else {
        const response = await fetch(`${API}/syllabus/`, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            subject_id: Number(subjectId),
            name: name.trim(),
            description: description.trim(),
            content: content.trim(),
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to save syllabus."
          );
        }

        syllabusId = data.syllabus?.id;
      }

      if (!syllabusId) {
        throw new Error(
          "Syllabus was saved, but no syllabus ID was returned."
        );
      }

      // ============================================
      // ANALYZE SAVED SYLLABUS
      // ============================================

      const analyzeResponse = await fetch(
        `${API}/syllabus/${syllabusId}/analyze`,
        {
          method: "POST",

          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        }
      );

      const analyzeData = await analyzeResponse
        .json()
        .catch(() => ({}));

      if (!analyzeResponse.ok) {
        throw new Error(
          analyzeData.detail || "Unable to analyze syllabus."
        );
      }

      setAnalysis(analyzeData.analysis);
    } catch (err) {
      console.error("Syllabus analysis error:", err);

      setError(
        err.message || "Something went wrong while analyzing."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">

      {/* =========================================
          HEADER
      ========================================== */}

      <div className="page-header">
        <h1>Syllabus Analyzer</h1>

        <p>
          Upload a syllabus file or enter syllabus content
          manually.
        </p>
      </div>

      {/* =========================================
          MODE BUTTONS
      ========================================== */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => changeMode("upload")}
          style={{
            padding: "12px 20px",
            fontWeight: "bold",
            cursor: "pointer",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          Upload Syllabus
        </button>

        <button
          onClick={() => changeMode("manual")}
          style={{
            padding: "12px 20px",
            fontWeight: "bold",
            cursor: "pointer",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          Enter Manually
        </button>
      </div>

      {/* =========================================
          INPUT CARD
      ========================================== */}

      <div className="card">

        <h2>
          {mode === "upload"
            ? "Upload Syllabus"
            : "Enter Syllabus Manually"}
        </h2>

        {/* SUBJECT */}

        <div style={{ marginTop: "20px" }}>
          <label>
            <strong>Subject</strong>
          </label>

          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={{
              marginTop: "8px",
              padding: "10px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <option value="">
              Select Subject
            </option>

            {subjects.map((subject) => (
              <option
                key={subject.id}
                value={subject.id}
              >
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* SYLLABUS NAME */}

        <div style={{ marginTop: "20px" }}>
          <label>
            <strong>Syllabus Name</strong>
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: Artificial Intelligence Syllabus 2026"
            style={{
              marginTop: "8px",
              padding: "10px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* DESCRIPTION */}

        <div style={{ marginTop: "20px" }}>
          <label>
            <strong>Description</strong>
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="Enter syllabus description"
            rows="3"
            style={{
              marginTop: "8px",
              padding: "10px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* =========================================
            FILE UPLOAD
        ========================================== */}

        {mode === "upload" && (
          <div style={{ marginTop: "20px" }}>

            <label>
              <strong>
                Upload Syllabus File
              </strong>
            </label>

            <p
              style={{
                fontSize: "14px",
                color: "#666",
              }}
            >
              Supported formats: PDF, DOC, DOCX, TXT
            </p>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              style={{
                marginTop: "10px",
              }}
            />

            {file && (
              <p>
                Selected file:{" "}
                <strong>{file.name}</strong>
              </p>
            )}
          </div>
        )}

        {/* =========================================
            MANUAL ENTRY
        ========================================== */}

        {mode === "manual" && (
          <div style={{ marginTop: "20px" }}>

            <label>
              <strong>Syllabus Content</strong>
            </label>

            <textarea
              value={content}
              onChange={(e) =>
                setContent(e.target.value)
              }
              placeholder={`Enter syllabus like:

UNIT I: INTRODUCTION
- AI basics
- Intelligent agents
- Problem solving

UNIT II: MACHINE LEARNING
- Supervised learning
- Unsupervised learning
- Classification

UNIT III: DEEP LEARNING
- Neural networks
- CNN
- RNN`}
              rows="15"
              style={{
                marginTop: "8px",
                padding: "12px",
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              background: "#ffe5e5",
              color: "#c00",
              borderRadius: "6px",
            }}
          >
            {error}
          </div>
        )}

        {/* ANALYZE BUTTON */}

        <button
          onClick={analyzeSyllabus}
          disabled={loading}
          style={{
            marginTop: "20px",
            padding: "12px 25px",
            fontWeight: "bold",
            cursor: loading
              ? "not-allowed"
              : "pointer",
            borderRadius: "6px",
            border: "none",
          }}
        >
          {loading
            ? "Analyzing..."
            : "Analyze Syllabus"}
        </button>
      </div>

      {/* =========================================
          ANALYSIS RESULT
      ========================================== */}

      {analysis && (
        <div
          className="card"
          style={{
            marginTop: "25px",
          }}
        >

          <h2>Analyzed Syllabus</h2>

          {/* SUBJECT NAME */}

          <div style={{ marginTop: "20px" }}>
            <h3>Subject Name</h3>

            <p>
              {analysis.subject_name ||
                "Not available"}
            </p>
          </div>

          {/* DESCRIPTION */}

          <div style={{ marginTop: "20px" }}>
            <h3>Description</h3>

            <p>
              {analysis.description ||
                "Not available"}
            </p>
          </div>

          {/* UNIT COUNT */}

          <div style={{ marginTop: "20px" }}>
            <p>
              <strong>
                Units Found:
              </strong>{" "}
              {analysis.units_found || 0}
            </p>

            <p>
              <strong>
                Topics Found:
              </strong>{" "}
              {analysis.topics_found || 0}
            </p>
          </div>

          {/* UNITS */}

          <div style={{ marginTop: "30px" }}>
            <h2>Units</h2>

            {analysis.units &&
            analysis.units.length > 0 ? (
              analysis.units.map(
                (unit, index) => (
                  <div
                    key={index}
                    style={{
                      marginTop: "20px",
                      padding: "18px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                    }}
                  >

                    <h3>
                      {unit.unit ||
                        `Unit ${index + 1}`}
                    </h3>

                    <div
                      style={{
                        marginTop: "10px",
                      }}
                    >
                      <strong>
                        Topics
                      </strong>

                      {unit.topics &&
                      unit.topics.length > 0 ? (
                        <ul>
                          {unit.topics.map(
                            (
                              topic,
                              topicIndex
                            ) => (
                              <li
                                key={
                                  topicIndex
                                }
                                style={{
                                  marginBottom:
                                    "6px",
                                }}
                              >
                                {topic}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p>
                          No topics available.
                        </p>
                      )}
                    </div>
                  </div>
                )
              )
            ) : (
              <p>
                No units found in the
                syllabus.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
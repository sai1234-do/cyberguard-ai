import { useRef, useState } from "react";
import { FileUp, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import AppSidebar from "../components/layout/AppSidebar";
import AppTopbar from "../components/layout/AppTopbar";
import { useSecurity } from "../context/SecurityContext";
import "./DataUpload.css";

function DataUpload() {
  const fileInputRef = useRef(null);
  const { events, fileName, uploadCsv, clearData } = useSecurity();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Upload a CSV file containing security events.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await uploadCsv(file);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-workspace">
        <AppTopbar />
        <main className="upload-page">
      <section className="upload-heading">
        <p>EVENT INGESTION</p>
        <h1>Upload Security Data</h1>
        <span>
          Upload safe synthetic logs to populate SentinelAI’s dashboard and
          incident workflow.
        </span>
      </section>

      <section className="upload-card">
        <ShieldCheck size={32} />

        <h2>Security Event CSV</h2>

        <p>
          Required fields: event timestamp, type, and message. Common source
          names such as <code>time</code>, <code>action</code>, <code>src_ip</code>,
          <code>hostname</code>, and <code>description</code> are recognized automatically.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          hidden
        />

        <button
          className="upload-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          <FileUp size={17} />
          {loading ? "PROCESSING DATA..." : "SELECT CSV FILE"}
        </button>

        {error && <div className="upload-error">{error}</div>}
      </section>

      {fileName && (
        <section className="upload-result">
          <div>
            <span>ACTIVE DATASET</span>
            <strong>{fileName}</strong>
            <small>{events.length} security events loaded</small>
          </div>
          <div className="upload-result-actions"><Link to="/dashboard">OPEN COMMAND CENTER</Link><button onClick={clearData}><Trash2 size={15} /> CLEAR DATA</button></div>
        </section>
      )}
        </main>
      </div>
    </div>
  );
}

export default DataUpload;

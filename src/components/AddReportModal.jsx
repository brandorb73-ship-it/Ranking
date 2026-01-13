import { useState } from "react";

export default function AddReportModal({ clients, onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [csv, setCsv] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState("Exporter");

  const submit = () => {
    if (!title || !csv) return alert("Title and CSV URL required");
    onSave({ title, csv, client, type });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Report</h2>

        <div className="modal-row">
          <label>Report Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="modal-row">
          <label>CSV URL</label>
          <input value={csv} onChange={e => setCsv(e.target.value)} />
        </div>

        <div className="modal-row">
          <label>Client</label>
          <input value={client} onChange={e => setClient(e.target.value)} />
        </div>

        <div className="modal-row">
          <label>Report Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="Exporter">Exporter Ranking</option>
            <option value="Importer">Importer Ranking</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={submit}>Publish</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

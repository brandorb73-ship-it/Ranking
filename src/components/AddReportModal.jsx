import { useState } from "react";

export default function AddReportModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    title: "",
    csv: "",
    client: "",
    type: "Exporter",
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Add New Report</h2>
        <div className="modal-row">
          <label>Title</label>
          <input
            placeholder="Report Title"
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="modal-row">
          <label>CSV URL</label>
          <input
            placeholder="https://docs.google.com/..."
            onChange={e => setForm({ ...form, csv: e.target.value })}
          />
        </div>
        <div className="modal-row">
          <label>Client</label>
          <input
            placeholder="Client Name"
            onChange={e => setForm({ ...form, client: e.target.value })}
          />
        </div>
        <div className="modal-row">
          <label>Report Type</label>
          <select onChange={e => setForm({ ...form, type: e.target.value })}>
            <option>Exporter</option>
            <option>Importer</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn primary" onClick={() => onSave(form)}>Publish</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

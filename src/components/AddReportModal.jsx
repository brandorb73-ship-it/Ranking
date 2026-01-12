import { useState } from "react";

export default function AddReportModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    title: "",
    csv: "",
    client: "",
    type: "Exporter",
  });

  return (
    <div className="modal">
      <h3>Add Report</h3>

      <input placeholder="Title Name" onChange={e => setForm({...form, title:e.target.value})} />
      <input placeholder="CSV URL" onChange={e => setForm({...form, csv:e.target.value})} />
      <input placeholder="Client" onChange={e => setForm({...form, client:e.target.value})} />

      <select onChange={e => setForm({...form, type:e.target.value})}>
        <option>Exporter</option>
        <option>Importer</option>
      </select>

      <button onClick={() => onSave(form)}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}

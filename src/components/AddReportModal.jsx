import { useState } from "react";

export default function AddReportModal({ clients, datasets, onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [csv, setCsv] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState("Exporter");

  // Filters for Phase 1
  const [filters, setFilters] = useState({
    Country: "",
    Transactions: "",
    "Weight(Kg)": "",
    "Amount($)": "",
    Quantity: "",
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    if (!title.trim() || !csv.trim()) {
      alert("Title and CSV URL required");
      return;
    }

    const newDataset = {
      title,
      csv,
      client,
      type,
      createdAt: new Date().toISOString(),
    };

    const newView = {
      title,
      csv,
      client,
      baseType: type,
      viewType: "BY_VALUE",
      filters,
      createdAt: new Date().toISOString(),
    };

    onSave(newView, newDataset);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add New Intelligence View</h2>

        <div className="modal-row">
          <label>Report Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter report title"
          />
        </div>

        <div className="modal-row">
          <label>CSV URL</label>
          <input
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="https://example.com/data.csv"
          />
        </div>

        <div className="modal-row">
          <label>Client</label>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client name"
          />
        </div>

        <div className="modal-row">
          <label>Report Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Exporter">Exporter Ranking</option>
            <option value="Importer">Importer Ranking</option>
          </select>
        </div>

        {Object.keys(filters).map((key) => (
          <div key={key} className="modal-row">
            <label>{key} Filter</label>
            <input
              value={filters[key]}
              onChange={(e) => handleFilterChange(key, e.target.value)}
            />
          </div>
        ))}

        <div className="modal-actions">
          <button type="button" className="primary" onClick={submit}>
            Publish
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

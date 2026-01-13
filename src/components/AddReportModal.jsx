import { useState } from "react";

export default function AddReportModal({ onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [csv, setCsv] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState("Exporter");

  const [filters, setFilters] = useState({
    Country: "",
    Transactions: "",
    "Weight(Kg)": "",
    "Amount($)": "",
    Quantity: "",
  });

  // Update a single filter value
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Handle Publish click
  const handlePublish = (e) => {
    e.preventDefault();     // prevent default form submission
    e.stopPropagation();    // stop modal overlay click from bubbling

    console.log("SUBMIT STATE", { title, csv, client, type, filters });

    if (!title.trim() || !csv.trim()) {
      alert("Title and CSV URL required");
      return;
    }

    // Dataset object (stored once)
    const newDataset = {
      title,
      csv,
      client,
      type,
      createdAt: new Date().toISOString(),
    };

    // Intelligence View object (stored in Saved Views)
    const newView = {
      title,
      csv,
      client,
      baseType: type,
      viewType: "BY_VALUE", // default view type
      filters,
      createdAt: new Date().toISOString(),
    };

    console.log("PUBLISH OK", newView, newDataset);

    // Call parent callback
    onSave(newView, newDataset);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // prevent overlay click
      >
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

        {/* Filters */}
        {Object.keys(filters).map((key) => (
          <div key={key} className="modal-row">
            <label>{key} Filter</label>
            <input
              value={filters[key]}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              placeholder={`Filter by ${key}`}
            />
          </div>
        ))}

        <div className="modal-actions">
          <button type="button" className="primary" onClick={handlePublish}>
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
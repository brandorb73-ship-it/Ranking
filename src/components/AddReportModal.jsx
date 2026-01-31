import { useState } from "react";
import Papa from "papaparse";

export default function AddReportModal({ onSave, onClose }) {
  const [title, setTitle] = useState(""); // Report Title
  const [csv, setCsv] = useState(""); // CSV URL
  const [client, setClient] = useState(""); // Optional client
  const [type, setType] = useState("Exporter"); // Exporter / Importer / Pivot

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
      alert("Report Title and CSV URL are required");
      return;
    }

    // ------------------ Parse CSV ------------------
    Papa.parse(csv, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // ------------------ CSV NORMALIZATION ------------------
        const expectedCols = ["PRODUCT", "Country", "Amount($)", "Weight(Kg)", "Quantity", "Type"];
        const normalizedRows = results.data.map((row) => {
          const newRow = {};
          expectedCols.forEach((col) => {
            const matchKey = Object.keys(row).find(
              (k) => k.trim().toLowerCase() === col.trim().toLowerCase()
            );
            newRow[col] = matchKey ? row[matchKey] : "";

            if (["Amount($)", "Weight(Kg)", "Quantity"].includes(col)) {
              newRow[col] = Number(String(newRow[col]).replace(/,/g, "")) || 0;
            }
          });
          return newRow;
        });

        // ------------------ CREATE VIEW OBJECT ------------------
        const newView = {
          title,              // <-- dynamic report title
          csv,
          client,
          baseType: type,     // Exporter / Importer / Pivot
          viewType: "BY_VALUE",
          filters,
          rows: normalizedRows,          // normalized CSV rows
          filteredRows: normalizedRows,  // initially same
          createdAt: new Date().toISOString(),
        };

        console.log("PUBLISH OK", newView);
        onSave(newView); // pass to parent
      },
      error: (err) => {
        alert("Error parsing CSV: " + err.message);
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add New Intelligence View</h2>

        {/* ---------------- Report Title ---------------- */}
        <div className="modal-row">
          <label>Report Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter report title"
          />
        </div>

        {/* ---------------- CSV URL ---------------- */}
        <div className="modal-row">
          <label>CSV URL</label>
          <input
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="https://example.com/data.csv"
          />
        </div>

        {/* ---------------- Client ---------------- */}
        <div className="modal-row">
          <label>Client</label>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client name"
          />
        </div>

        {/* ---------------- Report Type ---------------- */}
        <div className="modal-row">
          <label>Report Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Exporter">Exporter Ranking</option>
            <option value="Importer">Importer Ranking</option>
            <option value="Pivot">Pivot Table</option>
          </select>
        </div>

        {/* ---------------- Filters ---------------- */}
        {Object.keys(filters).map((key) => (
          <div key={key} className="modal-row">
            <label>{key} Filter</label>
            <input
              value={filters[key]}
              onChange={(e) => handleFilterChange(key, e.target.value)}
            />
          </div>
        ))}

        {/* ---------------- Actions ---------------- */}
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

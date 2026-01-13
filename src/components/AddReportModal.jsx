import { useState } from "react";

export default function AddReportModal({ clients, datasets = [], onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [datasetUrl, setDatasetUrl] = useState(""); // new or selected dataset
  const [selectedDataset, setSelectedDataset] = useState(""); // existing dataset URL
  const [client, setClient] = useState("");
  const [baseType, setBaseType] = useState("Exporter");
  const [viewType, setViewType] = useState("BY_VALUE");
  const [filterCountry, setFilterCountry] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const submit = () => {
    const finalDataset = datasetUrl || selectedDataset;
    if (!title || !finalDataset) return alert("Title and CSV URL required");

    const newView = {
      title,
      dataset: finalDataset,
      client,
      baseType,
      viewType,
      filters: {
        country: filterCountry ? filterCountry.split(",").map(c => c.trim()) : [],
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined
      },
      sorts: [],
      createdAt: new Date().toISOString()
    };

    // If user uploaded a new dataset, pass it as second argument to add to datasets
    onSave(newView, datasetUrl ? finalDataset : null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Intelligence View</h2>

        <div className="modal-row">
          <label>Report Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="modal-row">
          <label>Select Existing Dataset</label>
          <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value)}>
            <option value="">-- Select CSV --</option>
            {datasets.map((d, idx) => (
              <option key={idx} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="modal-row">
          <label>Or Upload New CSV URL</label>
          <input value={datasetUrl} onChange={e => setDatasetUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className="modal-row">
          <label>Client</label>
          <input value={client} onChange={e => setClient(e.target.value)} />
        </div>

        <div className="modal-row">
          <label>Base Type</label>
          <select value={baseType} onChange={e => setBaseType(e.target.value)}>
            <option value="Exporter">Exporter Ranking</option>
            <option value="Importer">Importer Ranking</option>
          </select>
        </div>

        <div className="modal-row">
          <label>View Type</label>
          <select value={viewType} onChange={e => setViewType(e.target.value)}>
            <option value="BY_VALUE">By Value</option>
            <option value="BY_WEIGHT">By Weight</option>
            <option value="BY_TXNS">By Transactions</option>
            <option value="BY_COUNTRY">By Country</option>
          </select>
        </div>

        <div className="modal-row">
          <label>Filter: Country (comma-separated)</label>
          <input value={filterCountry} onChange={e => setFilterCountry(e.target.value)} placeholder="USA, China" />
        </div>

        <div className="modal-row">
          <label>Filter: Min Amount</label>
          <input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} />
        </div>

        <div className="modal-row">
          <label>Filter: Max Amount</label>
          <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={submit}>Publish View</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

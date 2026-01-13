import { useEffect, useState } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ReportTable({ report, onBack }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({});

  useEffect(() => {
    if (!report?.dataset) return setRows([]);

    Papa.parse(report.dataset, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let data = results.data.map((row) => {
          ["Transactions", "Weight(Kg)", "Amount($)", "Quantity"].forEach((k) => {
            if (row[k]) row[k] = Number(String(row[k]).replace(/,/g, "")) || 0;
          });
          return row;
        });

        // Apply saved intelligence view filters
        if (report.filters) {
          if (report.filters.country?.length) {
            data = data.filter(row => report.filters.country.includes(row.Country));
          }
          if (report.filters.minAmount) {
            data = data.filter(row => Number(row["Amount($)"]) >= report.filters.minAmount);
          }
          if (report.filters.maxAmount) {
            data = data.filter(row => Number(row["Amount($)"]) <= report.filters.maxAmount);
          }
        }

        // Apply sorting based on viewType
        switch (report.viewType) {
          case "BY_VALUE":
            data.sort((a, b) => (b["Amount($)"] || 0) - (a["Amount($)"] || 0));
            break;
          case "BY_WEIGHT":
            data.sort((a, b) => (b["Weight(Kg)"] || 0) - (a["Weight(Kg)"] || 0));
            break;
          case "BY_TXNS":
            data.sort((a, b) => (b["Transactions"] || 0) - (a["Transactions"] || 0));
            break;
          case "BY_COUNTRY":
            data.sort((a, b) => (a.Country || "").localeCompare(b.Country || ""));
            break;
          default:
            break;
        }

        // Add Phase 1-lite risk flags
        data = data.map(row => {
          const flags = [];
          if ((row["Weight(Kg)"] || 0) > 10000 && (row["Amount($)"] || 0) < 5000) flags.push("⚠ Under-valued");
          if ((row["Transactions"] || 0) > 100) flags.push("⚠ Structuring");
          if ((row.CountryPercent || 0) > 80) flags.push("⚠ Concentration");
          return { ...row, RiskFlags: flags.join(", ") };
        });

        setRows(data);
      },
      error: () => setRows([])
    });
  }, [report]);

  const handleFilter = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const filteredRows = rows.filter((r) =>
    Object.entries(filter).every(
      ([k, v]) => !v || String(r[k]).toLowerCase().includes(v.toLowerCase())
    )
  );

  const total = (key) =>
    filteredRows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);

  const exportPDF = () => {
    const el = document.getElementById("report-table");
    if (!el) return;
    html2canvas(el).then(canvas => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "pt", "a4");
      pdf.addImage(img, "PNG", 20, 20, 800, 0);
      pdf.save(`${report.title}.pdf`);
    });
  };

  if (!rows.length) return <div className="empty-state">Loading report…</div>;

  return (
    <div className="report-wrapper">
      <div className="report-header">
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <h2>{report.title}</h2>
        <button className="btn primary" onClick={exportPDF}>Export PDF</button>
      </div>

      <div className="table-container" id="report-table">
        <table className="report-table">
          <thead>
            <tr>
              {Object.keys(rows[0]).map((h) => (
                <th key={h}>
                  <div className="th-title">{h}</div>
                  <select
                    value={filter[h] || ""}
                    onChange={e => handleFilter(h, e.target.value)}
                  >
                    <option value="">All</option>
                    {[...new Set(rows.map(r => r[h]).filter(Boolean))].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((r, i) => (
              <tr key={i}>
                {Object.entries(r).map(([k, v]) => (
                  <td key={k}>
                    {k === "Url" ? (
                      <a href={v} target="_blank" rel="noreferrer">Link</a>
                    ) : k === "RiskFlags" ? (
                      <span style={{ color: "orange", fontWeight: "bold" }}>{v}</span>
                    ) : typeof v === "number" ? v.toFixed(2) : v}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="total-row">
              <td>Total</td>
              <td>{total("Transactions").toFixed(2)}</td>
              <td>{total("Weight(Kg)").toFixed(2)}</td>
              <td>{total("Amount($)").toFixed(2)}</td>
              <td>{total("Quantity").toFixed(2)}</td>
              {Object.keys(rows[0]).slice(5).map((_, i) => (
                <td key={i}></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

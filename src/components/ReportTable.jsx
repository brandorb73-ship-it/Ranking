import { useEffect, useState } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ReportTable({ report, onBack }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({});

  // Placeholder CSV for testing if no CSV URL is provided
  const sampleCSV = `Exporter,Transactions,Weight(Kg),Amount($),Quantity,Country,Notes,Url
ABC Inc,10,100,5000,50,USA,Note1,http://example.com
XYZ Ltd,5,50,2000,20,Canada,Note2,http://example.com
MNO Corp,8,70,3000,30,Mexico,Note3,http://example.com`;

  useEffect(() => {
    if (!report) return;

    // If no CSV URL, use sample CSV
    const csvSource = report.csv && report.csv.trim() !== "" ? report.csv : sampleCSV;
    const download = report.csv && report.csv.trim() !== "";

    Papa.parse(csvSource, {
      download,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map((row) => {
          ["Transactions", "Weight(Kg)", "Amount($)", "Quantity"].forEach((k) => {
            if (row[k]) {
              row[k] = Number(String(row[k]).replace(/,/g, "")) || 0;
            }
          });
          return row;
        });
        setRows(data);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setRows([]); // fallback to empty
      },
    });
  }, [report]);

  const handleFilter = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
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
    html2canvas(el).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "pt", "a4");
      pdf.addImage(img, "PNG", 20, 20, 800, 0);
      pdf.save(`${report.title || "report"}.pdf`);
    });
  };

  if (!rows.length) {
    return <div className="empty-state">Loading report…</div>;
  }

  return (
    <div className="report-wrapper">
      <div className="report-header">
        <button className="btn secondary" onClick={onBack}>
          ← Back
        </button>
        <h2>{report.title || "Untitled Report"}</h2>
        <button className="btn primary" onClick={exportPDF}>
          Export PDF
        </button>
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
                    onChange={(e) => handleFilter(h, e.target.value)}
                  >
                    <option value="">All</option>
                    {[...new Set(rows.map((r) => r[h]).filter(Boolean))].map(
                      (v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      )
                    )}
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
                      <a href={v} target="_blank" rel="noreferrer">
                        Link
                      </a>
                    ) : typeof v === "number" ? (
                      v.toFixed(2)
                    ) : (
                      v
                    )}
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

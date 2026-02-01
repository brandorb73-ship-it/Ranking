import { useEffect, useState } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ReportTable({ report, onBack }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({});

  // Formatting Helper
  const formatValue = (v, header = "") => {
    if (v === null || v === undefined || isNaN(v)) return "0";
    
    const h = header.toLowerCase();
    // No decimals for Quantity or Transactions
    const isInteger = h.includes("quantity") || h.includes("transactions") || h.includes("txns");
    
    return Number(v).toLocaleString(undefined, {
      minimumFractionDigits: isInteger ? 0 : 2,
      maximumFractionDigits: isInteger ? 0 : 2,
    });
  };

  useEffect(() => {
    if (!report) return;

    const csvSource = report.csv && report.csv.trim() !== "" ? report.csv : "";
    const isUrl = report.csv && report.csv.trim().startsWith("http");

    Papa.parse(csvSource, {
      download: isUrl,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cleanedData = results.data.map((row) => {
          Object.keys(row).forEach((key) => {
            const isNumericKey = /amount|weight|price|quantity|transactions|txns|value/i.test(key) || key.includes("$");
            if (isNumericKey && row[key] !== null) {
              const cleanNum = String(row[key]).replace(/[$,]/g, "");
              row[key] = !isNaN(cleanNum) && cleanNum !== "" ? Number(cleanNum) : row[key];
            }
          });
          return row;
        });
        setRows(cleanedData);
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
    html2canvas(el, { scale: 2 }).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "pt", "a4");
      pdf.addImage(img, "PNG", 20, 20, 800, 0);
      pdf.save(`${report.title || "report"}.pdf`);
    });
  };

  if (!rows.length) return <div className="empty-state">Loading report…</div>;

  const columnHeaders = Object.keys(rows[0]);

  return (
    <div className="report-wrapper">
      <div className="report-header">
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <h2>{report.title || "Untitled Report"}</h2>
        <button className="btn primary" onClick={exportPDF}>Export PDF</button>
      </div>

      <div className="table-container" id="report-table">
        <table className="report-table">
          <thead>
            <tr>
              {columnHeaders.map((h) => (
                <th key={h}>
                  <div className="th-title">{h}</div>
                  <select value={filter[h] || ""} onChange={(e) => handleFilter(h, e.target.value)}>
                    <option value="">All</option>
                    {[...new Set(rows.map((r) => r[h]).filter(Boolean))].map((v) => (
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
                {columnHeaders.map((h) => (
                  <td key={h} style={{ textAlign: typeof r[h] === "number" ? "right" : "left" }}>
                    {h === "Url" ? (
                      <a href={r[h]} target="_blank" rel="noreferrer">Link</a>
                    ) : typeof r[h] === "number" ? (
                      formatValue(r[h], h)
                    ) : (
                      r[h]
                    )}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="total-row" style={{ fontWeight: "bold", background: "#f9f9f9" }}>
              {columnHeaders.map((h, i) => {
                const isNumeric = typeof rows[0][h] === "number";
                return (
                  <td key={h} style={{ textAlign: isNumeric ? "right" : "left" }}>
                    {i === 0 ? "Total" : isNumeric ? formatValue(total(h), h) : ""}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
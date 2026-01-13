import { useEffect, useState } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ReportTable({ report }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({});

  useEffect(() => {
    if (!report?.csv) return;

    Papa.parse(report.csv, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map(row => {
          ["Transactions","Weight(Kg)","Amount($)","Quantity"].forEach(key => {
            row[key] = Number(
              String(row[key] || "0").replace(/,/g, "")
            );
          });
          return row;
        });
        setRows(data);
      },
    });
  }, [report]);

  const formatNum = (val) =>
    Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const total = (key) =>
    rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);

  const handleFilter = (key, value) => {
    setFilter({ ...filter, [key]: value });
  };

  const filteredRows = rows.filter(r =>
    Object.keys(filter).every(key =>
      !filter[key] || String(r[key]).toLowerCase().includes(filter[key].toLowerCase())
    )
  );

  const exportPDF = () => {
    const input = document.getElementById("report-table");
    html2canvas(input).then(canvas => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "pt", "a4");
      pdf.addImage(imgData, "PNG", 20, 20, 800, 0);
      pdf.save(`${report.title}.pdf`);
    });
  };

  if (!rows.length) return <p>Loading report…</p>;

  return (
    <div className="report-table-container">
      <h2 className="report-title">{report.title}</h2>

      <button className="btn primary" onClick={exportPDF}>
        Export PDF
      </button>

      <table className="report-table" id="report-table">
        <thead>
<thead>
  <tr>
    {rows.length > 0 &&
      Object.keys(rows[0]).map((h) => (
        <th key={h}>
          <div className="th-label">{h}</div>

          <select
            className="filter-select"
            value={filter[h] || ""}
            onChange={(e) => handleFilter(h, e.target.value)}
          >
            <option value="">All</option>
            {[...new Set(rows.map(r => r[h]).filter(Boolean))].map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </th>
      ))}
  </tr>
</thead>

        <tbody>
          {filteredRows.map((r, idx) => (
            <tr key={idx}>
              {Object.entries(r).map(([k, v]) => (
                <td key={k} className={["Transactions","Weight(Kg)","Amount($)","Quantity"].includes(k) ? "num" : ""}>
                  {k === "Url"
                    ? <a href={v} target="_blank" rel="noreferrer">Link</a>
                    : ["Transactions","Weight(Kg)","Amount($)","Quantity"].includes(k)
                      ? formatNum(v)
                      : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td>Total</td>
            <td className="num">{formatNum(total("Transactions"))}</td>
            <td className="num">{formatNum(total("Weight(Kg)"))}</td>
            <td className="num">{formatNum(total("Amount($)"))}</td>
            <td className="num">{formatNum(total("Quantity"))}</td>
            {Object.keys(rows[0]).slice(5).map((_, i) => <td key={i}></td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

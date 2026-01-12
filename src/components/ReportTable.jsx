import { useEffect, useState } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ReportTable({ report }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({});

  useEffect(() => {
    Papa.parse(report.csv, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Convert numeric columns properly
        const data = results.data.map(row => {
          ["Transactions","Weight(Kg)","Amount($)","Quantity"].forEach(key => {
            row[key] = parseFloat(row[key].replace(/,/g, "")) || 0;
          });
          return row;
        });
        setRows(data);
      },
    });
  }, [report]);

  const total = (key) => rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);

  const handleFilter = (key, value) => {
    setFilter({ ...filter, [key]: value });
  };

  const filteredRows = rows.filter(r => {
    return Object.keys(filter).every(key =>
      !filter[key] || r[key].toString().toLowerCase().includes(filter[key].toLowerCase())
    );
  });

  const exportPDF = () => {
    const input = document.getElementById("report-table");
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "pt", "a4");
      pdf.addImage(imgData, "PNG", 20, 20, 800, 0);
      pdf.save(`${report.title}.pdf`);
    });
  };

  return (
    <div className="report-table-container">
      <h2 className="report-title">{report.title}</h2>
      <button className="btn primary" onClick={exportPDF}>Export PDF</button>
      <table className="report-table" id="report-table">
        <thead>
          <tr>
            {rows[0] && Object.keys(rows[0]).map((h, idx) => (
              <th key={idx}>
                {h}
                <input
                  className="filter-input"
                  placeholder="Filter"
                  onChange={(e) => handleFilter(h, e.target.value)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((r, idx) => (
            <tr key={idx}>
              {Object.entries(r).map(([k,v], i) => (
                <td key={i}>
                  {k === "Url" ? <a href={v} target="_blank" rel="noreferrer">{v}</a> : v}
                </td>
              ))}
            </tr>
          ))}
          <tr className="total-row">
            <td>Total</td>
            <td>{total("Transactions")}</td>
            <td>{total("Weight(Kg)")}</td>
            <td>{total("Amount($)")}</td>
            <td>{total("Quantity")}</td>
            {Object.keys(rows[0] || {}).slice(5).map((_, i) => <td key={i}></td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

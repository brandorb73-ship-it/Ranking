import { useEffect, useState } from "react";

export default function ReportTable({ report }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch(report.csv)
      .then(res => res.text())
      .then(text => {
        const [headerLine, ...lines] = text.trim().split("\n");
        const headers = headerLine.split(",");
        const data = lines.map(line => {
          const values = line.split(",");
          return headers.reduce((acc, key, idx) => {
            let val = values[idx] || "";
            // convert numeric columns
            if (["Transactions", "Weight(Kg)", "Amount($)", "Quantity"].includes(key)) {
              val = parseFloat(val) || 0;
            }
            acc[key] = val;
            return acc;
          }, {});
        });
        setRows(data);
      });
  }, [report]);

  const total = (key) => rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);

  return (
    <div className="report-table-container">
      <h2 className="report-title">{report.title}</h2>
      <table className="report-table">
        <thead>
          <tr>
            {rows[0] && Object.keys(rows[0]).map((h, idx) => (
              <th key={idx}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              {Object.values(r).map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
          <tr className="total-row">
            <td>Total</td>
            <td>{total("Transactions")}</td>
            <td>{total("Weight(Kg)")}</td>
            <td>{total("Amount($)")}</td>
            <td>{total("Quantity")}</td>
            {/* fill empty cells for rest */}
            {Object.keys(rows[0] || {}).slice(5).map((_, i) => <td key={i}></td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

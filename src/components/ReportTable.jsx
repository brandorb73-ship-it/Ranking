import { useEffect, useState } from "react";

export default function ReportTable({ report }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch(report.csv)
      .then(res => res.text())
      .then(text => {
        const [header, ...lines] = text.split("\n");
        const keys = header.split(",");
        const data = lines.map(l =>
          Object.fromEntries(l.split(",").map((v, i) => [keys[i], v]))
        );
        setRows(data);
      });
  }, [report]);

  const total = (key) =>
    rows.reduce((sum, r) => sum + Number(r[key] || 0), 0);

  return (
    <table>
      <thead>
        <tr>
          {Object.keys(rows[0] || {}).map(k => <th key={k}>{k}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {Object.values(r).map((v, j) => <td key={j}>{v}</td>)}
          </tr>
        ))}
        <tr className="total">
          <td>Total</td>
          <td>{total("Transactions")}</td>
          <td>{total("Weight(Kg)")}</td>
          <td>{total("Amount($)")}</td>
          <td>{total("Quantity")}</td>
        </tr>
      </tbody>
    </table>
  );
}

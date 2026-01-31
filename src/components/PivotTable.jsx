// components/PivotTable.jsx

export default function PivotTable({ title, rows, valueLabel }) {
  return (
    <>
      <h3>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>{valueLabel}</th>
            <th style={{ textAlign: "right" }}>Export</th>
            <th style={{ textAlign: "right" }}>Import</th>
            <th style={{ textAlign: "right" }}>Grand Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td style={{ textAlign: "right" }}>{r.Export.toLocaleString()}</td>
              <td style={{ textAlign: "right" }}>{r.Import.toLocaleString()}</td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>
                {r.Total.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

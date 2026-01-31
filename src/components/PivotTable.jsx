import { useMemo, useState } from "react";

export default function PivotTable({ rows = [] }) {
  const [pivotBy, setPivotBy] = useState("PRODUCT"); // "PRODUCT" or "Country"
  const [metric, setMetric] = useState("Amount($)"); // "Amount($)", "Weight(Kg)", "Quantity"

  // ---------------- PIVOT DATA ----------------
  const pivotData = useMemo(() => {
    const agg = {};

    rows.forEach((r) => {
      const key =
        pivotBy === "PRODUCT"
          ? r.PRODUCT || "Unknown"
          : r.Country || "Unknown";

      const type = (r.Type || "").toLowerCase(); // "export" or "import"

      const value = Number(r[metric] || 0);

      if (!agg[key]) {
        agg[key] = { Export: 0, Import: 0 };
      }

      if (type === "export") agg[key].Export += value;
      else if (type === "import") agg[key].Import += value;
    });

    // Convert to array and add Grand Total
    return Object.entries(agg).map(([key, val]) => ({
      key,
      Export: val.Export,
      Import: val.Import,
      Total: val.Export + val.Import,
    }));
  }, [rows, pivotBy, metric]);

  // ---------------- TOTALS ----------------
  const totals = useMemo(() => {
    return pivotData.reduce(
      (acc, row) => {
        acc.Export += row.Export;
        acc.Import += row.Import;
        acc.Total += row.Total;
        return acc;
      },
      { Export: 0, Import: 0, Total: 0 }
    );
  }, [pivotData]);

  return (
    <div style={{ padding: 12 }}>
      {/* -------- CONTROLS -------- */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div>
          Pivot by:{" "}
          <select value={pivotBy} onChange={(e) => setPivotBy(e.target.value)}>
            <option value="PRODUCT">Product</option>
            <option value="Country">Partner Country</option>
          </select>
        </div>

        <div>
          Metric:{" "}
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="Amount($)">Amount ($)</option>
            <option value="Weight(Kg)">Weight (Kg)</option>
            <option value="Quantity">Quantity</option>
          </select>
        </div>
      </div>

      {/* -------- PIVOT TABLE -------- */}
      <div
        style={{
          maxHeight: 400,
          overflowY: "auto",
          border: "1px solid #ccc",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "#f4f4f4" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>
                {pivotBy}
              </th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>Export</th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>Import</th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>
                Grand Total
              </th>
            </tr>
          </thead>
          <tbody>
            {pivotData.map((r) => (
              <tr key={r.key}>
                <td style={{ padding: "4px 8px" }}>{r.key}</td>
                <td style={{ textAlign: "right", padding: "4px 8px" }}>
                  {r.Export.toLocaleString()}
                </td>
                <td style={{ textAlign: "right", padding: "4px 8px" }}>
                  {r.Import.toLocaleString()}
                </td>
                <td style={{ textAlign: "right", padding: "4px 8px" }}>
                  {r.Total.toLocaleString()}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr style={{ fontWeight: "bold", background: "#e2e8f0" }}>
              <td style={{ padding: "4px 8px" }}>Total</td>
              <td style={{ textAlign: "right", padding: "4px 8px" }}>
                {totals.Export.toLocaleString()}
              </td>
              <td style={{ textAlign: "right", padding: "4px 8px" }}>
                {totals.Import.toLocaleString()}
              </td>
              <td style={{ textAlign: "right", padding: "4px 8px" }}>
                {totals.Total.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useMemo } from "react";

/**
 * ChartDashboard
 * - SAFE hook usage (no conditional hooks)
 * - Uses filteredRows if provided, else rows
 * - Ready for scatter / heatmap / combined views
 */
export default function ChartDashboard({ rows = [], filteredRows = [] }) {
  /* ================= SAFE DATA SELECTION ================= */
  const safeRows = useMemo(() => {
    if (Array.isArray(filteredRows) && filteredRows.length > 0) {
      return filteredRows;
    }
    if (Array.isArray(rows)) {
      return rows;
    }
    return [];
  }, [rows, filteredRows]);

  /* ================= SCATTER DATA ================= */
  const scatterData = useMemo(() => {
    if (!safeRows.length) return [];

    return safeRows.map((r, idx) => {
      const weight = Number(r["Weight(Kg)"]) || 0;
      const amount = Number(r["Amount($)"]) || 0;

      return {
        id: idx,
        weight,
        amount,
        country: r.Country || "Unknown",
        transactions: Number(r.Transactions) || 0,
        isOutlier: amount > 500000 || weight > 100000, // fraud lens
      };
    });
  }, [safeRows]);

  /* ================= COUNTRY HEATMAP DATA ================= */
  const heatmapData = useMemo(() => {
    const map = {};

    safeRows.forEach((r) => {
      const country = r.Country || "Unknown";
      const tx = Number(r.Transactions) || 0;

      if (!map[country]) {
        map[country] = { country, transactions: 0 };
      }
      map[country].transactions += tx;
    });

    return Object.values(map);
  }, [safeRows]);

  /* ================= EARLY SAFE RENDER ================= */
  if (!safeRows.length) {
    return (
      <div style={{ padding: 20 }}>
        <h3>No data available for charts</h3>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div style={{ padding: 20 }}>
      <h2>Charts & Intelligence View</h2>

      {/* ========= SCATTER PLACEHOLDER ========= */}
      <div style={{ marginTop: 20 }}>
        <h3>Weight vs Amount (Fraud Lens)</h3>
        <div
          style={{
            background: "#f8f9fb",
            border: "1px solid #cbd5e1",
            padding: 10,
            borderRadius: 6,
            maxHeight: 300,
            overflow: "auto",
          }}
        >
          {scatterData.slice(0, 50).map((d) => (
            <div
              key={d.id}
              style={{
                fontSize: 12,
                color: d.isOutlier ? "orange" : "#0a1f44",
              }}
            >
              {d.country} → Weight: {d.weight.toLocaleString()} kg | Amount: $
              {d.amount.toLocaleString()}
              {d.isOutlier && " ⚠️"}
            </div>
          ))}
        </div>
      </div>

      {/* ========= HEATMAP PLACEHOLDER ========= */}
      <div style={{ marginTop: 30 }}>
        <h3>Country Transaction Intensity</h3>
        <div
          style={{
            background: "#f8f9fb",
            border: "1px solid #cbd5e1",
            padding: 10,
            borderRadius: 6,
            maxHeight: 300,
            overflow: "auto",
          }}
        >
          {heatmapData.map((c) => (
            <div key={c.country} style={{ fontSize: 13 }}>
              {c.country} → {c.transactions.toLocaleString()} transactions
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

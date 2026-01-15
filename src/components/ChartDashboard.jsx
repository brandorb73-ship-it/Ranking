import { useEffect, useState } from "react";
import Papa from "papaparse";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ChartDashboard({ report }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!report?.csv) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    Papa.parse(report.csv, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cleaned = results.data.map((row) => {
          ["Transactions", "Weight(Kg)", "Amount($)", "Quantity"].forEach(
            (k) => {
              if (row[k]) {
                row[k] = Number(String(row[k]).replace(/,/g, "")) || 0;
              }
            }
          );
          return row;
        });

        setRows(cleaned);
        setLoading(false);
      },
      error: () => {
        setRows([]);
        setLoading(false);
      },
    });
  }, [report]);

  if (loading) {
    return <div>Loading chart data…</div>;
  }

  if (!rows.length) {
    return <div>No chart data available</div>;
  }

  // 🔹 Top 10 entities by Amount($)
  const topByValue = [...rows]
    .sort((a, b) => (b["Amount($)"] || 0) - (a["Amount($)"] || 0))
    .slice(0, 10)
    .map((r) => ({
      name: r.Exporter || r.Importer || "Unknown",
      value: r["Amount($)"] || 0,
    }));

  return (
    <div style={{ background: "#fff", padding: 16, borderRadius: 6 }}>
      <h3 style={{ marginBottom: 12 }}>
        Top 10 {report.baseType}s by Amount ($)
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topByValue}>
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
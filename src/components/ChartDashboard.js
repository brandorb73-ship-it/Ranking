import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter, Treemap, ResponsiveContainer } from "recharts";

export default function ChartDashboard({ report }) {
  if (!report || !report.dataset || !report.dataset.length) {
    return <div>Loading chart data…</div>;
  }

  const data = report.dataset;

  // ---------------- BAR CHART: Top 10 Exporters by Value ----------------
  const topByValue = [...data]
    .sort((a, b) => (b["Amount($)"] || 0) - (a["Amount($)"] || 0))
    .slice(0, 10);

  // ---------------- SCATTER PLOT: Weight vs Amount ----------------
  const scatterData = data.map(d => ({
    x: d["Weight(Kg)"] || 0,
    y: d["Amount($)"] || 0,
    name: d["Exporter"] || ""
  }));

  // ---------------- TREEMAP: Country → Exporter → Amount ----------------
  const countryMap = {};
  data.forEach(d => {
    const country = d["Country"] || "Unknown";
    if (!countryMap[country]) countryMap[country] = [];
    countryMap[country].push({ name: d["Exporter"], size: d["Amount($)"] || 0 });
  });
  const treemapData = Object.entries(countryMap).map(([country, children]) => ({
    name: country,
    children
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {/* BAR CHART */}
      <div>
        <h3>Top 10 Exporters by Amount</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topByValue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Exporter" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Amount($)" fill="#1e3a8a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SCATTER PLOT */}
      <div>
        <h3>Weight vs Amount (Scatter)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid />
            <XAxis type="number" dataKey="x" name="Weight" unit="Kg" />
            <YAxis type="number" dataKey="y" name="Amount" unit="$" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="Exporters" data={scatterData} fill="#1e3a8a" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* TREEMAP */}
      <div>
        <h3>Market Share Treemap (Country → Exporter → Amount)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={treemapData}
            dataKey="size"
            nameKey="name"
            ratio={4/3}
            stroke="#fff"
            fill="#1e3a8a"
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}

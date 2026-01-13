import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, Treemap
} from "recharts";

export default function ChartDashboard({ data, savedView }) {
  if (!data || !data.length) return <div>Loading chart data…</div>;

  // --------------------------
  // BarChart: Top 10 Exporters by Amount
  // --------------------------
  const topExporters = [...data]
    .sort((a, b) => (b["Amount($)"] || 0) - (a["Amount($)"] || 0))
    .slice(0, 10)
    .map((row) => ({
      ...row,
      flagged: row["Risk Flags"] ? true : false
    }));

  // --------------------------
  // ScatterChart: Weight vs Amount
  // --------------------------
  const scatterData = data.map((row) => ({
    x: row["Weight(Kg)"] || 0,
    y: row["Amount($)"] || 0,
    exporter: row["Exporter"],
    flagged: row["Risk Flags"] ? true : false
  }));

  // --------------------------
  // Treemap: Country → Exporter → Amount
  // --------------------------
  const treemapData = [];
  const countryMap = {};

  data.forEach((row) => {
    const country = row["Country"] || "Unknown";
    if (!countryMap[country]) countryMap[country] = { name: country, children: [] };
    countryMap[country].children.push({ name: row["Exporter"], value: row["Amount($)"] || 0 });
  });

  Object.values(countryMap).forEach((c) => treemapData.push(c));

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "40px" }}>
      <h3>{savedView?.title || "Charts"}</h3>

      {/* Bar Chart */}
      <div style={{ width: "100%", height: 300 }}>
        <h4>Top 10 Exporters by Amount($)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topExporters}>
            <XAxis dataKey="Exporter" />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="Amount($)"
              fill="#1e3a8a"
              stroke="#0a1f44"
              label={{ position: "top" }}
              isAnimationActive={false}
            >
              {topExporters.map((entry, idx) => (
                <cell
                  key={`cell-${idx}`}
                  fill={entry.flagged ? "#f59e0b" : "#1e3a8a"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter Chart */}
      <div style={{ width: "100%", height: 300 }}>
        <h4>Weight vs Amount</h4>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid />
            <XAxis type="number" dataKey="x" name="Weight(Kg)" />
            <YAxis type="number" dataKey="y" name="Amount($)" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value, name, props) => {
                if (name === "x") return [`${value} Kg`, "Weight"];
                if (name === "y") return [`$${value}`, "Amount"];
                return [value, name];
              }}
              labelFormatter={(idx) => scatterData[idx]?.exporter || ""}
            />
            <Scatter
              name="Exporters"
              data={scatterData}
              fill="#1e3a8a"
              shape="circle"
              isAnimationActive={false}
            >
              {scatterData.map((entry, idx) => (
                <circle
                  key={idx}
                  r={entry.flagged ? 8 : 5}
                  fill={entry.flagged ? "#f59e0b" : "#1e3a8a"}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Treemap */}
      <div style={{ width: "100%", height: 300 }}>
        <h4>Market Dominance (Country → Exporter → Amount)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData}
            dataKey="value"
            nameKey="name"
            stroke="#fff"
            fill="#1e3a8a"
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
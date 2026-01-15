import React, { useMemo, useRef } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { ComposedChart, Bar, Cell } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ChartDashboard({ rows = [], filteredRows = [] }) {
  const chartRef = useRef(null);

  // Use filteredRows if available
  const data = useMemo(() => filteredRows.length ? filteredRows : rows, [rows, filteredRows]);

  if (!data || data.length === 0) return <div>No data available for charts</div>;

  // Calculate simple outlier (fraud lens) — example: Amount($) > 2x average
  const avgAmount = data.reduce((sum, r) => sum + (r["Amount($)"] || 0), 0) / data.length;
  const outlierThreshold = avgAmount * 2;

  const scatterData = data.map((r) => ({
    ...r,
    risk: r["Amount($)"] > outlierThreshold ? "High" : "Normal",
  }));

  // Country heatmap aggregation
  const countryMap = {};
  data.forEach((r) => {
    if (!r.Country) return;
    countryMap[r.Country] = (countryMap[r.Country] || 0) + (r.Transactions || 0);
  });
  const heatmapData = Object.entries(countryMap).map(([country, transactions]) => ({ country, transactions }));

  // Export charts to PDF
  const exportPDF = () => {
    if (!chartRef.current) return;
    html2canvas(chartRef.current).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      pdf.addImage(img, "PNG", 20, 20, 555, 300);
      pdf.save("charts.pdf");
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={exportPDF} className="btn primary">Export Charts PDF</button>
      </div>

      <div ref={chartRef}>
        {/* Scatter Plot: Weight vs Amount */}
        <h3>Weight vs Amount (Scatter Plot)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid />
            <XAxis type="number" dataKey="Weight(Kg)" name="Weight" />
            <YAxis type="number" dataKey="Amount($)" name="Amount" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter 
              name="Shipments" 
              data={scatterData} 
              fill="#1e3a8a"
              shape={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.risk === "High" ? 6 : 4}
                    fill={payload.risk === "High" ? "orange" : "#1e3a8a"}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Country Heatmap */}
        <h3>Country Transaction Intensity (Heatmap)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={heatmapData}>
            <CartesianGrid />
            <XAxis dataKey="country" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="transactions">
              {heatmapData.map((entry, index) => {
                let color = "#1e3a8a";
                if (entry.transactions > 50) color = "orange";
                if (entry.transactions > 100) color = "red";
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

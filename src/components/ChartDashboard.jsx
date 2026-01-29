import React, { useMemo, useRef } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Simple world map topojson
const geoUrl =
  "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

export default function ChartDashboard({ rows = [], filteredRows = [] }) {
  const chartRef = useRef(null);
  const data = filteredRows.length ? filteredRows : rows;

  // Scatter plot data
  const scatterData = useMemo(() => {
    return data.map((r) => ({
      x: r["Weight(Kg)"] || 0,
      y: r["Amount($)"] || 0,
      country: r.Country,
      amount: r["Amount($)"],
      weight: r["Weight(Kg)"],
    }));
  }, [data]);

  // Bar chart data
  const barData = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      if (!r.Country) return;
      if (!map[r.Country]) map[r.Country] = 0;
      map[r.Country] += Number(r.Transactions) || 0;
    });
    return Object.entries(map).map(([country, val]) => ({ country, val }));
  }, [data]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      if (!r.Country) return;
      if (!map[r.Country]) map[r.Country] = 0;
      map[r.Country] += Number(r.Transactions) || 0;
    });
    return map;
  }, [data]);

  const maxHeat = Math.max(...Object.values(heatmapData), 1);

  // PDF export
  const exportPDF = () => {
    if (!chartRef.current) return;
    html2canvas(chartRef.current).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "pt", "a4");
      pdf.addImage(img, "PNG", 20, 20, 800, 0);
      pdf.save("charts.pdf");
    });
  };

  if (!data.length) {
    return <div>No data available for charts</div>;
  }

  return (
    <div ref={chartRef} style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <button className="btn secondary" onClick={exportPDF}>
          Export Charts to PDF
        </button>
      </div>

      {/* Scatter Plot */}
      <h3>Scatter: Weight vs Amount</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Weight(Kg)" />
          <YAxis type="number" dataKey="y" name="Amount($)" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value, name, props) => {
              return name === "y"
                ? `$${value}`
                : value;
            }}
          />
          <Scatter
            name="Transactions"
            data={scatterData}
            fill="#1e3a8a"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Bar Chart */}
      <h3>Transactions by Country</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="country" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="val" fill="#1e3a8a" />
        </BarChart>
      </ResponsiveContainer>

      {/* Heatmap */}
      <h3>Country Heatmap</h3>
      <div style={{ maxWidth: "100%", overflowX: "auto", marginTop: 12 }}>
        <ComposableMap projectionConfig={{ scale: 150 }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const val = heatmapData[geo.properties.NAME] || 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={val ? `rgba(30,58,138,${val / maxHeat})` : "#EEE"}
                    stroke="#FFF"
                  />
                );
              })
            }
          </Geographies>

          {/* Add circle markers proportional to transactions */}
   {Object.entries(heatmapData).map(([country, val], idx) => {
  // Only render markers for countries we have coordinates for
  const coordsLookup = {
    "United States": [-98, 38],
    China: [104, 35],
    India: [78, 21],
    Brazil: [-51, -10],
    Russia: [105, 60],
    Germany: [10, 51],
    France: [2, 46],
    "United Kingdom": [0, 54],
  };
  const coords = coordsLookup[country];
  if (!coords) return null; // skip countries without coordinates
  return (
    <Marker key={idx} coordinates={coords}>
      <circle
        r={Math.min(Math.sqrt(val) * 1.5, 20)} // cap radius to avoid huge circles
        fill="orange"
        opacity={0.7}
      />
    </Marker>
  );
})}

            const coords = coordsLookup[country];
            if (!coords) return null;
            return (
              <Marker key={idx} coordinates={coords}>
                <circle r={Math.sqrt(val) * 1.5} fill="orange" opacity={0.6} />
              </Marker>
            );
          })}
        </ComposableMap>
      </div>
    </div>
  );
}

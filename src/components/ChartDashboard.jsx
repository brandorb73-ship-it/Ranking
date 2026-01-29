import { useMemo, useRef } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* ---------------- COUNTRY COORDS (SAFE SET) ---------------- */
const COUNTRY_COORDS = {
  "United States": [-98, 38],
  China: [104, 35],
  India: [78, 21],
  Brazil: [-51, -10],
  Russia: [105, 60],
  Germany: [10, 51],
  France: [2, 46],
  "United Kingdom": [0, 54],
  Japan: [138, 37],
  Australia: [134, -25],
};

export default function ChartDashboard({ rows = [], filteredRows = [] }) {
  const chartRef = useRef(null);

  /* ---------------- DATA SOURCE ---------------- */
  const data = filteredRows.length ? filteredRows : rows;

  if (!data || !data.length) {
    return <div style={{ padding: 20 }}>No data available for charts</div>;
  }

  /* ---------------- SCATTER DATA ---------------- */
  const scatterData = useMemo(
    () =>
      data
        .map((r) => ({
          weight: Number(r["Weight(Kg)"] || r.Weight || 0),
          amount: Number(r["Amount($)"] || r.Amount || 0),
        }))
        .filter((r) => r.weight > 0 && r.amount > 0),
    [data]
  );

  /* ---------------- BAR DATA ---------------- */
  const barData = useMemo(() => {
    const agg = {};
    data.forEach((r) => {
      const country = r.Country || "Unknown";
      agg[country] =
        (agg[country] || 0) +
        Number(r["Amount($)"] || r.Amount || 0);
    });
    return Object.entries(agg).map(([k, v]) => ({
      country: k,
      value: v,
    }));
  }, [data]);

  /* ---------------- HEATMAP DATA ---------------- */
  const heatmapData = useMemo(() => {
    const agg = {};
    data.forEach((r) => {
      const c = r.Country;
      if (!c || !COUNTRY_COORDS[c]) return;
      agg[c] = (agg[c] || 0) + 1;
    });
    return agg;
  }, [data]);

  const maxHeat = Math.max(...Object.values(heatmapData), 1);

  /* ---------------- PDF EXPORT ---------------- */
  const exportPDF = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(img, "PNG", 10, 10, 190, 0);
    pdf.save("charts.pdf");
  };

  /* ================= RENDER ================= */
  return (
    <div ref={chartRef} style={{ padding: 20 }}>
      {/* ---------- ACTIONS ---------- */}
      <div style={{ marginBottom: 12 }}>
        <button className="btn secondary" onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      {/* ================= SCATTER ================= */}
      <h3>Weight vs Amount (Outlier Detection)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <XAxis dataKey="weight" name="Weight (Kg)" />
          <YAxis dataKey="amount" name="Amount ($)" />
          <Tooltip />
          <Scatter data={scatterData} fill="#2563eb" />
        </ScatterChart>
      </ResponsiveContainer>

      {/* ================= BAR ================= */}
      <h3 style={{ marginTop: 30 }}>Transaction Value by Country</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData}>
          <XAxis dataKey="country" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value">
            {barData.map((_, i) => (
              <Cell key={i} fill="#16a34a" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* ================= HEATMAP ================= */}
      <h3 style={{ marginTop: 30 }}>
        Country Transaction Intensity Heatmap
      </h3>

      <ComposableMap projectionConfig={{ scale: 140 }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = geo.properties.NAME;
              const val = heatmapData[name] || 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={
                    val
                      ? `rgba(234,88,12,${val / maxHeat})`
                      : "#EEE"
                  }
                  stroke="#CCC"
                />
              );
            })
          }
        </Geographies>

        {Object.entries(heatmapData).map(([country, val], idx) => {
          const coords = COUNTRY_COORDS[country];
          if (!coords) return null;
          return (
            <Marker key={idx} coordinates={coords}>
              <circle
                r={Math.min(Math.sqrt(val) * 2, 18)}
                fill="orange"
                opacity={0.7}
              />
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}

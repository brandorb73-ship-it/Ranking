import { useMemo, useRef, useState, useEffect } from "react";
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

/* ===================== HELPERS ===================== */

function deriveRiskFlags(row, context) {
  const flags = [];

  const amount = Number(row["Amount($)"] || row.Amount || 0);
  const weight = Number(row["Weight(Kg)"] || row.Weight || 0);

  if (amount > context.p95Amount && weight < context.p25Weight) {
    flags.push("High value / low weight");
  }

  if (weight > context.p95Weight && amount < context.p25Amount) {
    flags.push("High weight / low value");
  }

  if (row.Country && context.singleCountryMap[row.Country]) {
    flags.push("Country concentration");
  }

  return flags;
}

/* ---------------- COUNTRY COORDS ---------------- */

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

/* ===================== COMPONENT ===================== */

export default function ChartDashboard({ rows = [], filteredRows = [] }) {
  const chartRef = useRef(null);
  const [showOnlyRisky, setShowOnlyRisky] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  /* ---------------- DATA SOURCE ---------------- */
  const data = filteredRows.length ? filteredRows : rows;

  if (!data || !data.length) {
    return <div style={{ padding: 20 }}>No data available for charts</div>;
  }

  /* ===================== RISK CONTEXT ===================== */
  const context = useMemo(() => {
    const amounts = data.map(r =>
      Number(r["Amount($)"] || r.Amount || 0)
    );
    const weights = data.map(r =>
      Number(r["Weight(Kg)"] || r.Weight || 0)
    );

    const sortedA = [...amounts].sort((a, b) => a - b);
    const sortedW = [...weights].sort((a, b) => a - b);

    const pct = (arr, p) =>
      arr[Math.floor(arr.length * p)] || 0;

    const countryCount = {};
    data.forEach(r => {
      if (!r.Country) return;
      countryCount[r.Country] = (countryCount[r.Country] || 0) + 1;
    });

    const singleCountryMap = {};
    Object.keys(countryCount).forEach(c => {
      if (countryCount[c] / data.length > 0.8) {
        singleCountryMap[c] = true;
      }
    });

    return {
      p95Amount: pct(sortedA, 0.95),
      p25Amount: pct(sortedA, 0.25),
      p95Weight: pct(sortedW, 0.95),
      p25Weight: pct(sortedW, 0.25),
      singleCountryMap,
    };
  }, [data]);

  /* ===================== ENRICH DATA ===================== */
  const enrichedData = useMemo(
    () =>
      data.map(r => ({
        ...r,
        riskFlags: deriveRiskFlags(r, context),
      })),
    [data, context]
  );

  /* ===================== SCATTER DATA ===================== */
  const scatterData = useMemo(() => {
    const base = enrichedData
      .map(r => ({
        weight: Number(r["Weight(Kg)"] || r.Weight || 0),
        amount: Number(r["Amount($)"] || r.Amount || 0),
        riskFlags: r.riskFlags || [],
        Entity: r.Entity || r.Exporter || r.Importer || r.entity,
        Country: r.Country,
      }))
      .filter(r => r.weight > 0 && r.amount > 0);

    return showOnlyRisky
      ? base.filter(r => r.riskFlags.length > 0)
      : base;
  }, [enrichedData, showOnlyRisky]);

  /* ===================== BAR DATA ===================== */
  const barData = useMemo(() => {
    const agg = {};
    enrichedData.forEach(r => {
      const country = r.Country || "Unknown";
      agg[country] =
        (agg[country] || 0) +
        Number(r["Amount($)"] || r.Amount || 0);
    });
    return Object.entries(agg).map(([k, v]) => ({
      country: k,
      value: v,
    }));
  }, [enrichedData]);

  /* Track risky countries for bar chart highlighting */
  const riskyCountryMap = useMemo(() => {
    const map = {};
    enrichedData.forEach(r => {
      if (r.riskFlags.length && r.Country) {
        map[r.Country] = true;
      }
    });
    return map;
  }, [enrichedData]);

  /* ===================== HEATMAP DATA ===================== */
  const heatmapData = useMemo(() => {
    const agg = {};
    enrichedData.forEach(r => {
      const c = r.Country;
      if (!c || !COUNTRY_COORDS[c]) return;
      agg[c] = (agg[c] || 0) + 1;
    });
    return agg;
  }, [enrichedData]);

  const maxHeat = Math.max(...Object.values(heatmapData), 1);

  /* ===================== PDF EXPORT ===================== */
  const exportPDF = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(img, "PNG", 10, 10, 190, 0);
    pdf.save("charts.pdf");
  };

  /* ===================== SCROLL TO TABLE ROW ===================== */
  useEffect(() => {
    if (!selectedEntity) return;
    const el = document.getElementById(`row-${selectedEntity}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedEntity]);

  /* ===================== RENDER ===================== */
  return (
    <div ref={chartRef} style={{ padding: 20 }}>
      {/* ---------- ACTIONS ---------- */}
      <div style={{ marginBottom: 12 }}>
        <button className="btn secondary" onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      {/* ---------- TOGGLE & LEGEND ---------- */}
      <label style={{ display: "block", marginBottom: 6 }}>
        <input
          type="checkbox"
          checked={showOnlyRisky}
          onChange={e => setShowOnlyRisky(e.target.checked)}
          style={{ marginRight: 6 }}
        />
        Show only risky entities
      </label>

      <div style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            border: "1.5px dashed #111",
            borderRadius: "50%",
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        Risk-flagged entity (heuristic-based)
      </div>

      {/* ===================== SCATTER ===================== */}
      <h3>Weight vs Amount (Risk Annotations)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <XAxis dataKey="weight" name="Weight (Kg)" />
          <YAxis dataKey="amount" name="Amount ($)" />

          <Tooltip
            formatter={(value, name, props) => {
              const { payload } = props;
              if (!payload) return value;

              if (payload.riskFlags.length) {
                return [
                  value,
                  `${name}
⚠ ${payload.riskFlags.join(" | ")}`
                ];
              }
              return value;
            }}
          />

          <Scatter
            data={scatterData}
            onClick={point => setSelectedEntity(point.Entity)}
            shape={({ cx, cy, payload }) => (
              <g>
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={payload.Entity === selectedEntity ? "#ff0000" : "#2563eb"}
                />
                {payload.riskFlags.length > 0 && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="none"
                    stroke="#111"
                    strokeDasharray="3,2"
                  />
                )}
              </g>
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* ===================== BAR ===================== */}
      <h3 style={{ marginTop: 30 }}>Transaction Value by Country</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData}>
          <XAxis dataKey="country" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value">
            {barData.map((d, i) => (
              <Cell
                key={i}
                fill="#16a34a"
                stroke={riskyCountryMap[d.country] ? "#000" : "none"}
                strokeWidth={riskyCountryMap[d.country] ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* ===================== HEATMAP ===================== */}
      <h3 style={{ marginTop: 30 }}>
        Country Transaction Intensity Heatmap
      </h3>

      <ComposableMap projectionConfig={{ scale: 140 }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map(geo => {
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

      {/* ===================== TABLE ===================== */}
      <h3 style={{ marginTop: 30 }}>Entities Table</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Entity</th>
            <th>Amount ($)</th>
            <th>Weight (Kg)</th>
            <th>Country</th>
            <th>Risk Flags</th>
          </tr>
        </thead>
        <tbody>
          {enrichedData.map(row => (
            <tr
              id={`row-${row.Entity || row.Exporter || row.Importer || row.entity}`}
              key={row.Entity || row.Exporter || row.Importer || row.entity}
              style={{
                background:
                  selectedEntity === (row.Entity || row.Exporter || row.Importer || row.entity)
                    ? "rgba(255,0,0,0.1)"
                    : "transparent",
              }}
            >
              <td>{row.Entity || row.Exporter || row.Importer || row.entity}</td>
              <td>{row["Amount($)"] || row.Amount}</td>
              <td>{row["Weight(Kg)"] || row.Weight}</td>
              <td>{row.Country}</td>
              <td>{row.riskFlags.join(" | ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

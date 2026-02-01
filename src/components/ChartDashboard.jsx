import React, { useMemo, useState } from "react";
import { 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid 
} from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const RISK_COLORS = { low: "#10b981", med: "#f59e0b", high: "#ef4444" };

export default function ChartDashboard({ rows = [], filteredRows = [] }) {
  const [basis, setBasis] = useState("Amount"); 
  const [hoveredEntity, setHoveredEntity] = useState(null);
  
  const data = filteredRows.length > 0 ? filteredRows : rows;

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const basisKey = Object.keys(data[0]).find(k => 
      k.toLowerCase().includes(basis.toLowerCase().substring(0,3))
    ) || "Amount";

    const vals = data.map(r => Number(r[basisKey] || 0)).sort((a, b) => a - b);
    const p70 = vals[Math.floor(vals.length * 0.70)] || 0;
    const p90 = vals[Math.floor(vals.length * 0.90)] || 0;
    
    return data.map(r => {
      const val = Number(r[basisKey] || 0);
      const risk = val >= p90 ? "high" : (val >= p70 ? "med" : "low");
      return { 
        ...r, 
        _risk: risk, 
        _basisVal: val,
        x: Number(r.Weight || r["Weight(Kg)"] || 0), 
        y: Number(r.Amount || r["Amount($)"] || 0) 
      };
    });
  }, [data, basis]);

  const countryVolume = useMemo(() => {
    const counts = {};
    processedData.forEach(r => { 
      const c = r.Country || r.Origin || r.country;
      if (c && typeof c === 'string') {
        const key = c.toUpperCase().trim();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [processedData]);

  const maxVol = Math.max(...Object.values(countryVolume), 1);
  const outliers = [...processedData].sort((a, b) => b._basisVal - a._basisVal).slice(0, 5);

  if (!data.length) return <div style={{padding: '20px'}}>Processing charts...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* 1. TOP SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', borderTop: '4px solid #ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
           <h4 style={{ color: '#1e3a8a', marginTop: 0 }}>🚨 High Risk Profiles</h4>
           <table style={{ width: '100%', fontSize: '12px' }}>
             <tbody>
               {processedData.filter(r => r._risk === 'high').slice(0, 5).map((r, i) => (
                 <tr key={i}><td style={{padding: '4px 0'}}>{r._label}</td><td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 'bold' }}>HIGH</td></tr>
               ))}
             </tbody>
           </table>
        </div>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', borderTop: '4px solid #1e3a8a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
           <h4 style={{ color: '#1e3a8a', marginTop: 0 }}>📊 Top 5 {basis} Outliers</h4>
           <table style={{ width: '100%', fontSize: '12px' }}>
             <tbody>
               {outliers.map((r, i) => (
                 <tr key={i}><td style={{padding: '4px 0'}}>{r._label}</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{r._basisVal.toLocaleString()}</td></tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      {/* 2. CONTROLS */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {["Amount", "Weight", "Transactions"].map(t => (
            <button key={t} onClick={() => setBasis(t)} style={{
              padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', border: 'none',
              background: basis === t ? '#1e3a8a' : '#f1f5f9', color: basis === t ? '#fff' : '#475569', fontWeight: 'bold'
            }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
           {Object.entries(RISK_COLORS).map(([k, v]) => (
             <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}>
               <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: v }} /> {k.toUpperCase()}
             </div>
           ))}
        </div>
      </div>

      {/* 3. CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
        
        {/* SCATTER - WITH RINGS */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h4 style={{color: '#1e3a8a'}}>Risk Matrix (Weight vs Value)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" name="Weight" unit="kg" tickFormatter={v => v.toLocaleString()} />
              <YAxis type="number" dataKey="y" name="Value" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={v => v.toLocaleString()} />
              <Scatter data={processedData}>
                {processedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    onMouseEnter={() => setHoveredEntity(entry._label)}
                    onMouseLeave={() => setHoveredEntity(null)}
                    shape={(props) => {
                      const color = RISK_COLORS[entry._risk];
                      return (
                        <g style={{ cursor: 'pointer' }}>
                          {entry._risk === "high" && <circle cx={props.cx} cy={props.cy} r={14} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 2" />}
                          {entry._risk === "med" && <circle cx={props.cx} cy={props.cy} r={10} fill="none" stroke={color} strokeWidth={1} strokeDasharray="4 2" />}
                          <circle cx={props.cx} cy={props.cy} r={hoveredEntity === entry._label ? 8 : 6} fill={hoveredEntity === entry._label ? "#1e3a8a" : color} stroke="#fff" strokeWidth={1} />
                        </g>
                      );
                    }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* BAR CHART */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h4 style={{color: '#1e3a8a'}}>Top 5 Entities by {basis}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={outliers} margin={{ bottom: 80, left: 40 }}>
              <XAxis dataKey="_label" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => v.toLocaleString()} />
              <Tooltip formatter={v => v.toLocaleString()} />
              <Bar dataKey="_basisVal" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GEOGRAPHY */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h4 style={{color: '#1e3a8a'}}>Geographic Concentration</h4>
          <div style={{ height: '280px', overflow: 'hidden' }}>
            <ComposableMap projectionConfig={{ scale: 120, center: [10, 20] }} width={800} height={400}>
              <Geographies geography={geoUrl}>
                {({ geographies }) => geographies.map(geo => {
                  const name = (geo.properties?.NAME || geo.properties?.name || "").toUpperCase();
                  const count = countryVolume[name] || 0;
                  return <Geography key={geo.rsmKey} geography={geo} fill={count ? `rgba(30, 58, 138, ${0.2 + (count/maxVol)*0.8})` : "#f1f5f9"} stroke="#fff" strokeWidth={0.5} />;
                })}
              </Geographies>
            </ComposableMap>
          </div>
        </div>

        {/* PIE CHART - WITH PERCENTAGE LOGIC */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h4 style={{ color: '#1e3a8a' }}>Volume Distribution by {basis}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie 
                data={[
                  { name: 'Low', value: processedData.filter(x => x._risk === 'low').reduce((s, c) => s + c._basisVal, 0) },
                  { name: 'Med', value: processedData.filter(x => x._risk === 'med').reduce((s, c) => s + c._basisVal, 0) },
                  { name: 'High', value: processedData.filter(x => x._risk === 'high').reduce((s, c) => s + c._basisVal, 0) }
                ]} 
                dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                  return percent > 0.05 ? (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '10px', fontWeight: 'bold' }}>
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  ) : null;
                }}
              >
                <Cell fill={RISK_COLORS.low} /><Cell fill={RISK_COLORS.med} /><Cell fill={RISK_COLORS.high} />
              </Pie>
              <Tooltip formatter={(v) => v.toLocaleString()} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. INTERACTIVE RISK TABLE */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '2px solid #1e3a8a', overflow: 'hidden' }}>
        <div style={{ background: '#1e3a8a', color: '#fff', padding: '10px 20px', fontWeight: 'bold' }}>Interactive Risk Matrix</div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '12px' }}>Exporter</th>
                <th>Amount (USD)</th>
                <th>Weight (kg)</th>
                <th>Risk Analysis</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((r, i) => (
                <tr key={i} style={{ 
                  background: hoveredEntity === r._label ? '#eff6ff' : 'transparent',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <td style={{ padding: '10px 12px' }}>{r._label}</td>
                  <td>${r.y.toLocaleString()}</td>
                  <td>{r.x.toLocaleString()} kg</td>
                  <td><span style={{ padding: '2px 8px', borderRadius: '10px', background: RISK_COLORS[r._risk], color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>{r._risk.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
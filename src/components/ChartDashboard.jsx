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
  Line,
  Cell,
  PieChart,
  Pie,
  Legend
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

// ---------------- HELPERS ----------------
function formatNumber(value, decimals = 2) {
  if (value == null) return "-";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function formatInteger(value) {
  if (value == null) return "-";
  return Math.round(value).toLocaleString();
}
function deriveRiskFlags(row, context) {
  const flags = [];
  const amount = Number(row["Amount($)"] || row.Amount || 0);
  const weight = Number(row["Weight(Kg)"] || row.Weight || 0);
  const txn = Number(row.txnCount || row.Txns || 0);
  const { p75Amount, p25Amount, p75Weight, p25Weight, p75Txn, p25Txn, singleCountryMap } =
    context;

  if (amount > p75Amount && weight < p25Weight) flags.push("High value / low weight");
  if (weight > p75Weight && amount < p25Amount) flags.push("High weight / low value");
  if (txn > p75Txn && amount < p25Amount) flags.push("High frequency / low value");
  if (row.Country && singleCountryMap[row.Country]) flags.push("Country concentration");
  return flags;
}
function getRiskScore(flags) {
  if (!flags || !flags.length) return 0; // Low
  if (flags.length === 1) return 1; // Medium
  return 2; // High
}

// ---------------- COUNTRY COORDS ----------------
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
  Singapore: [103.8, 1.35],
  Canada: [-106, 56],
  Mexico: [-102, 23],
  Italy: [12.5, 42.5],
  Spain: [-3, 40],
  Netherlands: [5.3, 52.1],
  Belgium: [4.5, 50.8],
  SouthKorea: [127.5, 36],
  Turkey: [35, 39],
  SaudiArabia: [45, 25],
  UAE: [53, 24],
  Argentina: [-64, -34],
  SouthAfrica: [24, -29],
};

// ---------------- MAIN COMPONENT ----------------
export default function ChartDashboard({ rows = [], filteredRows = [] }) {
  const chartRef = useRef(null);

  const [showOnlyRisky, setShowOnlyRisky] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [filters, setFilters] = useState({
    minValue: 0,
    maxValue: Infinity,
    minWeight: 0,
    maxWeight: Infinity,
    minTxns: 0,
    maxTxns: Infinity,
  });
  const [pieDimension, setPieDimension] = useState("Risk");

  const data = filteredRows.length ? filteredRows : rows;
  if (!data || !data.length) return <div style={{ padding: 20 }}>No data available</div>;

  // ---------------- CONTEXT FOR RISK FLAGS ----------------
  const context = useMemo(() => {
    const amounts = data.map(r => Number(r["Amount($)"] || r.Amount || 0));
    const weights = data.map(r => Number(r["Weight(Kg)"] || r.Weight || 0));
    const txns = data.map(r => Number(r.txnCount || r.Txns || 0));
    const sorted = arr => [...arr].sort((a, b) => a - b);
    const pct = (arr, p) => arr[Math.floor(arr.length * p)] || 0;
    const n = data.length;
    const smallDataset = n < 100;
    const p75Amount = pct(sorted(amounts), smallDataset ? 0.5 : 0.75);
    const p25Amount = pct(sorted(amounts), 0.25);
    const p75Weight = pct(sorted(weights), smallDataset ? 0.5 : 0.75);
    const p25Weight = pct(sorted(weights), 0.25);
    const p75Txn = pct(sorted(txns), smallDataset ? 0.5 : 0.75);
    const p25Txn = pct(sorted(txns), 0.25);

    const countryCount = {};
    data.forEach(r => { if(r.Country) countryCount[r.Country] = (countryCount[r.Country]||0)+1; });
    const singleCountryMap = {};
    Object.keys(countryCount).forEach(c => {
      if (countryCount[c]/n > (smallDataset ? 0.5 : 0.8)) singleCountryMap[c] = true;
    });
    return { p75Amount, p25Amount, p75Weight, p25Weight, p75Txn, p25Txn, singleCountryMap };
  }, [data]);

  // ---------------- ENRICH DATA ----------------
  const enrichedData = useMemo(() => data.map(r => {
    const riskFlags = deriveRiskFlags(r, context);
    const riskScore = getRiskScore(riskFlags);
    return { ...r, riskFlags, riskScore };
  }), [data, context]);

  // ---------------- FILTERED DATA ----------------
  const filteredData = useMemo(() => {
    return enrichedData.filter(r => {
      const amt = Number(r["Amount($)"] || r.Amount || 0);
      const wt = Number(r["Weight(Kg)"] || r.Weight || 0);
      const txn = Number(r.txnCount || r.Txns || 0);
      if (amt < filters.minValue || amt > filters.maxValue) return false;
      if (wt < filters.minWeight || wt > filters.maxWeight) return false;
      if (txn < filters.minTxns || txn > filters.maxTxns) return false;
      if (showOnlyRisky && (!r.riskFlags || r.riskFlags.length === 0)) return false;
      return true;
    });
  }, [enrichedData, filters, showOnlyRisky]);

  // ---------------- SCATTER DATA ----------------
  const scatterData = useMemo(() => filteredData.map(r => ({
    weight: Number(r["Weight(Kg)"] || r.Weight || 0),
    amount: Number(r["Amount($)"] || r.Amount || 0),
    riskFlags: r.riskFlags,
    riskScore: r.riskScore,
    Entity: r.Entity || r.Exporter || r.Importer || r.entity,
    Country: r.Country,
    txnCount: r.txnCount || r.Txns || 0,
  })), [filteredData]);

  // ---------------- COLOR PALETTES ----------------
  const RISK_COLORS = ["#3f7d3d","#d97706","#c2410c"]; // Muted green, amber, red
  const CHART_COLORS = ["#1e3a8a","#2563eb","#0ea5e9","#64748b","#475569","#64748b"];

  // ---------------- HOVER & SELECTION HANDLING ----------------
  const handleScatterHover = (point) => setHoveredCountry(point.Country);
  const handleScatterLeave = () => setHoveredCountry(null);
  const handleSelectEntity = (entity) => setSelectedEntity(entity);

  // ---------------- TOP FLAGGED / OUTLIERS ----------------
  const topFlagged = useMemo(()=>[...filteredData].sort((a,b)=>b.riskFlags.length-a.riskFlags.length).slice(0,5),[filteredData]);
  const topOutliers = useMemo(()=>[...filteredData].sort((a,b)=>{
    const aScore=(Number(a.Amount||a["Amount($)"]||0)+Number(a.Weight||a["Weight(Kg)"]||0))/2;
    const bScore=(Number(b.Amount||b["Amount($)"]||0)+Number(b.Weight||b["Weight(Kg)"]||0))/2;
    return bScore-aScore;
  }).slice(0,5),[filteredData]);

  // ---------------- PDF EXPORT ----------------
  const exportPDF = async ()=>{
    if(!chartRef.current) return;
    const canvas=await html2canvas(chartRef.current,{scale:2});
    const img=canvas.toDataURL("image/png");
    const pdf=new jsPDF("p","mm","a4");
    pdf.addImage(img,"PNG",10,10,190,0);
    pdf.save("charts.pdf");
  };

  // ---------------- HEATMAP DATA ----------------
  const heatmapData = useMemo(()=>{
    const agg={};
    filteredData.forEach(r=>{ if(r.Country&&COUNTRY_COORDS[r.Country]) agg[r.Country]=(agg[r.Country]||0)+1; });
    return agg;
  },[filteredData]);
  const maxHeat = Math.max(...Object.values(heatmapData),1);

  // ---------------- PIE CHART DATA ----------------
  const pieData = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      let key;
      switch(pieDimension){
        case "Risk": key = r.riskScore; break;
        case "Country": key = r.Country||"Unknown"; break;
        case "Amount": key = Math.round(r.Amount||r["Amount($)"]||0); break;
        case "Weight": key = Math.round(r.Weight||r["Weight(Kg)"]||0); break;
        case "Transactions": key = r.txnCount||r.Txns||0; break;
        case "Entity": key = r.Entity||r.Exporter||r.Importer||r.entity; break;
        default: key="Other";
      }
      map[key] = (map[key]||0)+1;
    });
    return Object.entries(map).map(([name,value])=>({name,value}));
  }, [filteredData,pieDimension]);

  const COLORS = ["#1f4e79","#2563eb","#0ea5e9","#64748b","#475569","#64748b","#fbbf24","#f87171","#3f7d3d"];

  return (
    <div ref={chartRef} style={{padding:20}}>
      {/* -------- ACTIONS -------- */}
      <div style={{marginBottom:12}}>
        <button className="btn secondary" onClick={exportPDF}>Export PDF</button>
      </div>

      {/* -------- FILTERS -------- */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
        <div>Amount: <input type="range" min={0} max={Math.max(...enrichedData.map(d=>Number(d.Amount||d["Amount($)"]||0)))} value={filters.minValue} onChange={e=>setFilters(f=>({...f,minValue:Number(e.target.value)}))}/> {formatNumber(filters.minValue)}</div>
        <div>Weight: <input type="range" min={0} max={Math.max(...enrichedData.map(d=>Number(d.Weight||d["Weight(Kg)"]||0)))} value={filters.minWeight} onChange={e=>setFilters(f=>({...f,minWeight:Number(e.target.value)}))}/> {formatNumber(filters.minWeight)}</div>
        <div>Transactions: <input type="range" min={0} max={Math.max(...enrichedData.map(d=>Number(d.txnCount||d.Txns||0)))} value={filters.minTxns} onChange={e=>setFilters(f=>({...f,minTxns:Number(e.target.value)}))}/> {formatInteger(filters.minTxns)}</div>
      </div>
      <label><input type="checkbox" checked={showOnlyRisky} onChange={e=>setShowOnlyRisky(e.target.checked)} style={{marginRight:6}}/>Show only risky entities</label>

      {/* -------- RISK LEGEND -------- */}
      <div style={{margin:8}}>
        <strong>Risk Legend:</strong>
        <span style={{background:RISK_COLORS[0],width:20,height:12,display:"inline-block",marginLeft:8}}/> Low
        <span style={{background:RISK_COLORS[1],width:20,height:12,display:"inline-block",marginLeft:8}}/> Medium
        <span style={{background:RISK_COLORS[2],width:20,height:12,display:"inline-block",marginLeft:8}}/> High
      </div>

      {/* -------- SCATTER CHART -------- */}
      <h3 style={{marginTop:20}}>Weight vs Amount (Risk-Annotated)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{top:20,right:20,bottom:20,left:60}}>
          <XAxis dataKey="weight" name="Weight (Kg)" tickFormatter={formatNumber}/>
          <YAxis dataKey="amount" name="Amount ($)" tickFormatter={formatNumber}/>
          <Tooltip formatter={(value,name,props)=>{
            const {payload}=props;
            if(!payload) return value;
            return [formatNumber(value), payload.riskFlags.length ? `⚠ ${payload.riskFlags.join(" | ")}` : name];
          }}/>
          <Scatter
            data={scatterData}
            onClick={point=>handleSelectEntity(point.Entity)}
            shape={({cx,cy,payload})=>(
              <g>
                <circle cx={cx} cy={cy} r={4}
                  fill={payload.Entity===selectedEntity?"#ff4d6d":
                        payload.riskScore===2?RISK_COLORS[2]:
                        payload.riskScore===1?RISK_COLORS[1]:RISK_COLORS[0]}
                  stroke={hoveredCountry===payload.Country?"#000":"none"}
                  strokeWidth={hoveredCountry===payload.Country?2:0}
                  onMouseEnter={()=>handleScatterHover(payload)}
                  onMouseLeave={handleScatterLeave}
                />
                {payload.riskFlags.length>0 && (
                  <circle cx={cx} cy={cy} r={8} fill="none" stroke="#111" strokeDasharray="3,2"/>
                )}
              </g>
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* -------- SUMMARY PANEL -------- */}
      <div style={{display:"flex", gap:40, marginTop:12}}>
        <div>
          <strong>Top Risk Entities:</strong>
          <ol>
            {topFlagged.map(r=><li key={r.Entity||r.Exporter||r.Importer||r.entity}>{r.Entity||r.Exporter||r.Importer||r.entity} ({r.riskFlags.length} flags)</li>)}
          </ol>
        </div>
        <div>
          <strong>Top Outliers:</strong>
          <ol>
            {topOutliers.map(r=><li key={r.Entity||r.Exporter||r.Importer||r.entity}>{r.Entity||r.Exporter||r.Importer||r.entity} (${formatNumber(r.Amount||r["Amount($)"])}, {formatNumber(r.Weight||r["Weight(Kg)"])} Kg)</li>)}
          </ol>
        </div>
      </div>

      {/* -------- TABLE -------- */}
      <h3 style={{marginTop:20}}>Data Table</h3>
      <div style={{maxHeight:300, overflowY:"auto", border:"1px solid #ccc"}}>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead style={{position:"sticky", top:0, background:"#f4f4f4"}}>
            <tr>
              <th>Entity</th>
              <th>Country</th>
              <th>Amount ($)</th>
              <th>Weight (Kg)</th>
              <th>Transactions</th>
              <th>Risk Flags</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(r=>{
              const isSelected = r.Entity===selectedEntity || hoveredCountry===r.Country;
              return (
                <tr key={r.Entity} id={`row-${r.Entity}`}
                  style={{background:isSelected?"#fde68a":undefined, cursor:"pointer"}}
                  onClick={()=>handleSelectEntity(r.Entity)}>
                  <td>{r.Entity||r.Exporter||r.Importer||r.entity}</td>
                  <td>{r.Country}</td>
                  <td style={{textAlign:"right"}}>{formatNumber(r.Amount||r["Amount($)"])}</td>
                  <td style={{textAlign:"right"}}>{formatNumber(r.Weight||r["Weight(Kg)"])}</td>
                  <td style={{textAlign:"right"}}>{formatInteger(r.txnCount||r.Txns)}</td>
                  <td>{r.riskFlags.join(" | ")}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* -------- BAR + COMBO CHART -------- */}
      <h3 style={{marginTop:20}}>Country Value vs Transactions</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={Object.entries(filteredData.reduce((agg,r)=>{
          const c=r.Country||"Unknown";
          if(!agg[c]) agg[c]={value:0, txns:0};
          agg[c].value += Number(r.Amount||r["Amount($)"]||0);
          agg[c].txns += Number(r.txnCount||r.Txns||0);
          return agg;
        },{})).map(([country,v])=>({country,value:v.value,txns:v.txns}))}
        margin={{top:20,right:20,bottom:20,left:60}}>
          <XAxis dataKey="country"/>
          <YAxis yAxisId="left" orientation="left" tickFormatter={formatNumber}/>
          <YAxis yAxisId
::contentReference[oaicite:0]{index=0}
          <YAxis yAxisId="right" orientation="right" tickFormatter={formatInteger}/>
          <Tooltip formatter={(v)=>typeof v==="number"?formatNumber(v):v}/>
          <Legend/>
          <Bar yAxisId="left" dataKey="value" fill={CHART_COLORS[0]}/>
          <Line yAxisId="right" dataKey="txns" stroke={CHART_COLORS[1]} strokeWidth={2}/>
        </BarChart>
      </ResponsiveContainer>

      {/* -------- PIE CHART -------- */}
      <h3 style={{marginTop:20}}>Pie Chart - {pieDimension}</h3>
      <select value={pieDimension} onChange={e=>setPieDimension(e.target.value)} style={{marginBottom:12}}>
        <option value="Risk">Risk Score</option>
        <option value="Country">Country</option>
        <option value="Amount">Amount ($)</option>
        <option value="Weight">Weight (Kg)</option>
        <option value="Transactions">Transactions</option>
        <option value="Entity">Entity</option>
      </select>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({name,value})=>`${name}: ${value}`}
          >
            {pieData.map((_,index)=>(
              <Cell key={index} fill={COLORS[index % COLORS.length]}/>
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* -------- HEATMAP -------- */}
      <h3 style={{marginTop:30}}>Country Transaction Intensity Heatmap</h3>
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
                  fill={ val ? `rgba(234,88,12,${val / maxHeat})` : "#EEE" }
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

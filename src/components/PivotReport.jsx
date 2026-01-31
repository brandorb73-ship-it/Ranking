// components/PivotReport.jsx

import { useMemo, useState } from "react";
import { buildPivot } from "../utils/pivotUtils";
import PivotTable from "./PivotTable";

export default function PivotReport({ rows = [] }) {
  const [metric, setMetric] = useState("Amount($)");

  const productPivot = useMemo(
    () =>
      buildPivot({
        rows,
        dimension: "PRODUCT",
        metric,
      }),
    [rows, metric]
  );

  const countryPivot = useMemo(
    () =>
      buildPivot({
        rows,
        dimension: "Country",
        metric,
      }),
    [rows, metric]
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Import / Export Pivot Report</h2>

      <label>
        Metric:&nbsp;
        <select value={metric} onChange={e => setMetric(e.target.value)}>
          <option value="Amount($)">Amount ($)</option>
          <option value="Weight(Kg)">Weight (Kg)</option>
          <option value="Quantity">Quantity</option>
        </select>
      </label>

      <div style={{ marginTop: 30 }}>
        <PivotTable
          title="Pivot by Product"
          valueLabel="Product"
          rows={productPivot}
        />
      </div>

      <div style={{ marginTop: 40 }}>
        <PivotTable
          title="Pivot by Partner Country"
          valueLabel="Partner Country"
          rows={countryPivot}
        />
      </div>
    </div>
  );
}

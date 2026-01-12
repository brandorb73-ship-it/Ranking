export default function Header({ onAddReport }) {
  return (
    <div className="header">
      <input className="search-input" placeholder="Search reports..." />
      <div className="header-buttons">
        <button className="btn">Add Client</button>
        <button className="btn primary" onClick={onAddReport}>Add Report</button>
      </div>
    </div>
  );
}

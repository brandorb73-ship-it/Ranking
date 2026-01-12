export default function Header({ onAddReport }) {
  return (
    <div className="header">
      <input placeholder="Search reports..." />
      <div>
        <button>Add Client</button>
        <button onClick={onAddReport}>Add Report</button>
      </div>
    </div>
  );
}

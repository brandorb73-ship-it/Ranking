import React from "react";

export default function Login({ onLogin }) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0a1f44",
        color: "#fff",
        flexDirection: "column"
      }}
    >
      <h2>Shipment Rankings App</h2>
      <input type="password" placeholder="Enter password" />
      <button onClick={onLogin} style={{ marginTop: 10 }}>Login</button>
    </div>
  );
}

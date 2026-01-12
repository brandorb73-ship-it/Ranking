import { useState } from "react";

export default function Login({ onLogin }) {
  const [logo, setLogo] = useState(null);
  const [password, setPassword] = useState("");

  return (
    <div className="login">
      <h2>Supply Chain Intelligence</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setLogo(URL.createObjectURL(e.target.files[0]))}
      />

      {logo && <img src={logo} className="logo-preview" />}

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={onLogin}>Login</button>
    </div>
  );
}

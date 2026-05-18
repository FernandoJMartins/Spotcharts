import { useEffect } from "react";

export default function Login() {
  const handleSpotifyLogin = () => {
    // Redireciona para o backend que inicia o fluxo OAuth do Spotify
    window.location.href = "/api/auth/login/";
  };

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h1>Bem-vindo ao SpotCharts</h1>
      <button 
        onClick={handleSpotifyLogin}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#1DB954",
          color: "white",
          border: "none",
          borderRadius: "25px",
          cursor: "pointer",
        }}
      >
        Conectar com Spotify
      </button>
    </div>
  );
}

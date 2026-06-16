import { useState } from "react";
import { apiFetch } from "../../utils/appClient";

const BASE = "";

const Section = ({ title, children }) => (
  <div style={{
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  }}>
    <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1DB954" }}>{title}</h2>
    {children}
  </div>
);

const Label = ({ children }) => (
  <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 4 }}>{children}</label>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 7,
      color: "#fff",
      padding: "7px 11px",
      fontSize: 13,
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
      fontFamily: "inherit",
    }}
  />
);

const Btn = ({ onClick, children, color = "#1DB954", disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: color,
      border: "none",
      borderRadius: 7,
      color: color === "#1DB954" ? "#000" : "#fff",
      padding: "8px 18px",
      fontSize: 13,
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "opacity 0.15s",
      letterSpacing: "0.03em",
    }}
  >
    {children}
  </button>
);

const StatusTag = ({ status }) => {
  if (!status) return null;
  const colors = { ok: "#1DB954", error: "#e74c3c", loading: "#888" };
  const labels = { ok: "✓ OK", error: "✗ Error", loading: "…" };
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      color: colors[status] || "#888",
      background: `${colors[status] || "#888"}22`,
      borderRadius: 4,
      padding: "2px 8px",
      letterSpacing: "0.05em",
    }}>
      {labels[status] || status}
    </span>
  );
};

const ResultBox = ({ data }) => {
  if (!data) return null;
  return (
    <pre style={{
      background: "rgba(0,0,0,0.35)",
      borderRadius: 8,
      padding: "12px 14px",
      fontSize: 11,
      color: "#b0f0c0",
      overflowX: "auto",
      maxHeight: 200,
      margin: 0,
      fontFamily: "'Fira Mono', 'Consolas', monospace",
      border: "1px solid rgba(29,185,84,0.15)",
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

// ─── Endpoint panels ───────────────────────────────────────────────

function GetPlaylist({ token }) {
  const [playlistId, setPlaylistId] = useState("");
  const [market, setMarket] = useState("");
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  async function handle() {
    setStatus("loading"); setResult(null);
    try {
      const params = new URLSearchParams({ playlist_id: playlistId });
      if (market) params.set("market", market);
      const res = await fetch(apiFetch(`/api/auth/playlist/?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(await res.json());
      setStatus("ok");
    } catch { setStatus("error"); }
  }

  return (
    <Section title="Get Playlist">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
        <div><Label>Playlist ID</Label><Input value={playlistId} onChange={e => setPlaylistId(e.target.value)} placeholder="37i9dQZF1DXcBWIGoYBM5M" /></div>
        <div><Label>Market</Label><Input value={market} onChange={e => setMarket(e.target.value)} placeholder="BR" /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Btn onClick={handle} disabled={!playlistId}>Fetch</Btn>
        <StatusTag status={status} />
      </div>
      <ResultBox data={result} />
    </Section>
  );
}

function GetSavedTracks({ token }) {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [market, setMarket] = useState("");
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  async function handle() {
    setStatus("loading"); setResult(null);
    try {
      const params = new URLSearchParams({ limit, offset });
      if (market) params.set("market", market);
      const res = await fetch(apiFetch(`/api/auth/saved-tracks/?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(await res.json());
      setStatus("ok");
    } catch { setStatus("error"); }
  }

  return (
    <Section title="Saved Tracks">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 8 }}>
        <div><Label>Limit</Label><Input type="number" value={limit} onChange={e => setLimit(e.target.value)} /></div>
        <div><Label>Offset</Label><Input type="number" value={offset} onChange={e => setOffset(e.target.value)} /></div>
        <div><Label>Market</Label><Input value={market} onChange={e => setMarket(e.target.value)} placeholder="BR" /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Btn onClick={handle}>Fetch</Btn>
        <StatusTag status={status} />
      </div>
      <ResultBox data={result} />
    </Section>
  );
}

function GetTopItems({ token }) {
  const [itemType, setItemType] = useState("tracks");
  const [period, setPeriod] = useState("short");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  async function handle() {
    setStatus("loading"); setResult(null);
    try {
      const params = new URLSearchParams({ item_type: itemType, period, limit, offset });
      const res = await fetch(apiFetch(`/api/auth/top-items/?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(await res.json());
      setStatus("ok");
    } catch { setStatus("error"); }
  }

  const selectStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 7,
    color: "#fff",
    padding: "7px 11px",
    fontSize: 13,
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <Section title="Top Items">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <div>
          <Label>Type</Label>
          <select value={itemType} onChange={e => setItemType(e.target.value)} style={selectStyle}>
            <option value="tracks">Tracks</option>
            <option value="artists">Artists</option>
          </select>
        </div>
        <div>
          <Label>Period</Label>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={selectStyle}>
            <option value="short">Short (~4 weeks)</option>
            <option value="medium">Medium (~6 months)</option>
            <option value="long">Long (all time)</option>
          </select>
        </div>
        <div><Label>Limit</Label><Input type="number" value={limit} onChange={e => setLimit(e.target.value)} /></div>
        <div><Label>Offset</Label><Input type="number" value={offset} onChange={e => setOffset(e.target.value)} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Btn onClick={handle}>Fetch</Btn>
        <StatusTag status={status} />
      </div>
      <ResultBox data={result} />
    </Section>
  );
}

function GetRecentlyPlayed({ token }) {
  const [limit, setLimit] = useState(20);
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  async function handle() {
    setStatus("loading"); setResult(null);
    try {
      const params = new URLSearchParams({ limit });
      if (after) params.set("after", after);
      if (before) params.set("before", before);
      const res = await fetch(apiFetch(`/api/auth/recently-played/?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(await res.json());
      setStatus("ok");
    } catch { setStatus("error"); }
  }

  return (
    <Section title="Recently Played">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div><Label>Limit</Label><Input type="number" value={limit} onChange={e => setLimit(e.target.value)} /></div>
        <div><Label>After (unix ms)</Label><Input type="number" value={after} onChange={e => setAfter(e.target.value)} placeholder="optional" /></div>
        <div><Label>Before (unix ms)</Label><Input type="number" value={before} onChange={e => setBefore(e.target.value)} placeholder="optional" /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Btn onClick={handle}>Fetch</Btn>
        <StatusTag status={status} />
      </div>
      <ResultBox data={result} />
    </Section>
  );
}

function ResumePlayback({ token }) {
  const [deviceId, setDeviceId] = useState("");
  const [contextUri, setContextUri] = useState("");
  const [uris, setUris] = useState("");
  const [positionMs, setPositionMs] = useState("");
  const [status, setStatus] = useState(null);

  async function handle() {
    setStatus("loading");
    try {
      const body = {};
      if (contextUri) body.context_uri = contextUri;
      if (uris) body.uris = uris.split(",").map(s => s.trim()).filter(Boolean);
      if (positionMs !== "") body.position_ms = Number(positionMs);

      const url = deviceId
        ? apiFetch(`/resume-playback/?device_id=${encodeURIComponent(deviceId)}`)
        : apiFetch("/resume-playback/");

      await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      });
      setStatus("ok");
    } catch { setStatus("error"); }
  }

  return (
    <Section title="Resume Playback">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><Label>Device ID</Label><Input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="optional" /></div>
        <div><Label>Position (ms)</Label><Input type="number" value={positionMs} onChange={e => setPositionMs(e.target.value)} placeholder="optional" /></div>
        <div><Label>Context URI</Label><Input value={contextUri} onChange={e => setContextUri(e.target.value)} placeholder="spotify:playlist:…" /></div>
        <div><Label>Track URIs (comma-separated)</Label><Input value={uris} onChange={e => setUris(e.target.value)} placeholder="spotify:track:…, …" /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Btn onClick={handle} color="#1DB954">▶ Resume</Btn>
        <StatusTag status={status} />
      </div>
    </Section>
  );
}

function GetRecommendations({ token }) {
  const [seedArtists, setSeedArtists] = useState("");
  const [seedTracks, setSeedTracks] = useState("");
  const [seedGenres, setSeedGenres] = useState("");
  const [limit, setLimit] = useState(20);
  const [market, setMarket] = useState("");
  const [minEnergy, setMinEnergy] = useState("");
  const [maxEnergy, setMaxEnergy] = useState("");
  const [targetEnergy, setTargetEnergy] = useState("");
  const [minPop, setMinPop] = useState("");
  const [maxPop, setMaxPop] = useState("");
  const [targetPop, setTargetPop] = useState("");
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  async function handle() {
    setStatus("loading"); setResult(null);
    try {
      const params = new URLSearchParams({ limit });
      if (seedArtists) params.set("seed_artists", seedArtists);
      if (seedTracks) params.set("seed_tracks", seedTracks);
      if (seedGenres) params.set("seed_genres", seedGenres);
      if (market) params.set("market", market);
      if (minEnergy !== "") params.set("min_energy", minEnergy);
      if (maxEnergy !== "") params.set("max_energy", maxEnergy);
      if (targetEnergy !== "") params.set("target_energy", targetEnergy);
      if (minPop !== "") params.set("min_popularity", minPop);
      if (maxPop !== "") params.set("max_popularity", maxPop);
      if (targetPop !== "") params.set("target_popularity", targetPop);

      const res = await fetch(apiFetch(`/recommendations/?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(await res.json());
      setStatus("ok");
    } catch { setStatus("error"); }
  }

  return (
    <Section title="Recommendations">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div><Label>Seed Artists (comma-sep IDs)</Label><Input value={seedArtists} onChange={e => setSeedArtists(e.target.value)} placeholder="id1,id2" /></div>
        <div><Label>Seed Tracks (comma-sep IDs)</Label><Input value={seedTracks} onChange={e => setSeedTracks(e.target.value)} placeholder="id1,id2" /></div>
        <div><Label>Seed Genres (comma-sep)</Label><Input value={seedGenres} onChange={e => setSeedGenres(e.target.value)} placeholder="pop,rock" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
        <div><Label>Market</Label><Input value={market} onChange={e => setMarket(e.target.value)} placeholder="BR" /></div>
        <div><Label>Limit</Label><Input type="number" value={limit} onChange={e => setLimit(e.target.value)} /></div>
      </div>
      <div>
        <Label>Energy (0–1)</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div><Input type="number" step="0.01" min="0" max="1" value={minEnergy} onChange={e => setMinEnergy(e.target.value)} placeholder="min" /></div>
          <div><Input type="number" step="0.01" min="0" max="1" value={targetEnergy} onChange={e => setTargetEnergy(e.target.value)} placeholder="target" /></div>
          <div><Input type="number" step="0.01" min="0" max="1" value={maxEnergy} onChange={e => setMaxEnergy(e.target.value)} placeholder="max" /></div>
        </div>
      </div>
      <div>
        <Label>Popularity (0–100)</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div><Input type="number" min="0" max="100" value={minPop} onChange={e => setMinPop(e.target.value)} placeholder="min" /></div>
          <div><Input type="number" min="0" max="100" value={targetPop} onChange={e => setTargetPop(e.target.value)} placeholder="target" /></div>
          <div><Input type="number" min="0" max="100" value={maxPop} onChange={e => setMaxPop(e.target.value)} placeholder="max" /></div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Btn onClick={handle}>Fetch</Btn>
        <StatusTag status={status} />
      </div>
      <ResultBox data={result} />
    </Section>
  );
}

// ─── Main ───────────────────────────────────────────────────────────

export default function SpotifyDashboard() {
  const [token, setToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d0d",
      color: "#f0f0f0",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "32px 24px",
    }}>
      {/* Header */}
      <div style={{ maxWidth: 860, margin: "0 auto 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.87 7.076-.496 9.713 1.115a.623.623 0 01.206.857zm1.223-2.72a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.519-.972c3.632-1.102 8.147-.568 11.234 1.328a.78.78 0 01.257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 11-.543-1.794c3.532-1.072 9.404-.865 13.115 1.338a.937.937 0 01-1.955.615z"/>
          </svg>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Spotify API Explorer
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
          Test all endpoints with your access token.
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Token */}
        <Section title="Access Token">
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                type="password"
                value={token}
                onChange={e => { setToken(e.target.value); setTokenSaved(false); }}
                placeholder="Paste your Spotify access token…"
              />
            </div>
            <Btn onClick={() => setTokenSaved(true)} disabled={!token}>Save</Btn>
            {tokenSaved && <StatusTag status="ok" />}
          </div>
        </Section>

        <GetPlaylist token={token} />
        <GetSavedTracks token={token} />
        <GetTopItems token={token} />
        <GetRecentlyPlayed token={token} />
        <ResumePlayback token={token} />
        <GetRecommendations token={token} />
      </div>
    </div>
  );
}
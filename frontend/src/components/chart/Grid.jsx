import { useState, useEffect, useCallback } from "react";
import { withApiBase } from "../../utils/apiBase";
import { apiFetch } from "../../utils/appClient";
const BASE_URL = "http://localhost:8000";

const TRACK_ICONS = ["ti-music", "ti-microphone", "ti-vinyl", "ti-disc", "ti-radio"];
const rndIcon = () => TRACK_ICONS[Math.floor(Math.random() * TRACK_ICONS.length)];

const GENRES_MOCK = [
  { name: "Pop", pct: 42, color: "#1DB954" },
  { name: "Hip-hop", pct: 28, color: "#e8ff8b" },
  { name: "Eletrônico", pct: 17, color: "#a78bfa" },
  { name: "Rock", pct: 8, color: "#fb923c" },
  { name: "Outros", pct: 5, color: "#6a6a6a" },
];

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function formatAgo(dateStr) {
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function buildWeeklyCounts(items) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  items.forEach((it) => {
    if (it.played_at) {
      const d = new Date(it.played_at);
      counts[(d.getDay() + 6) % 7]++;
    } else {
      counts[Math.floor(Math.random() * 7)]++;
    }
  });
  return counts;
}

function Card({ title, badge, children }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>{title}</span>
        <span style={styles.cardBadge}>{badge}</span>
      </div>
      <div style={styles.cardBody}>{children}</div>
    </div>
  );
}

function TrackIcon({ accent }) {
  return (
    <div
      style={{
        ...styles.trackIcon,
        background: accent ? "rgba(232,255,139,0.07)" : "var(--sp-subtle)",
        color: accent ? "var(--sp-accent)" : "var(--sp-muted)",
      }}
    >
      <i
        className={`ti ${accent ? "ti-sparkles" : rndIcon()}`}
        style={{ fontSize: 15 }}
        aria-hidden="true"
      />
    </div>
  );
}

function PlayButton({ label }) {
  return (
    <button style={styles.playBtn} aria-label={`Tocar ${label}`}>
      <i className="ti ti-player-play" style={{ fontSize: 10, color: "#000" }} aria-hidden="true" />
    </button>
  );
}

function Skeleton({ width = "100%", height = 12, mb = 0 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: "var(--sp-subtle)",
        marginBottom: mb,
        animation: "shimmer 1.5s ease infinite",
      }}
    />
  );
}

function LoadingState({ text = "Carregando..." }) {
  return (
    <div style={styles.loadingState}>
      <i
        className="ti ti-loader-2"
        style={{ fontSize: 14, animation: "spin 1s linear infinite" }}
        aria-hidden="true"
      />
      {text}
    </div>
  );
}


function TopItems({ items, loading }) {
  const mock = [
    { name: "Blinding Lights", artist: "The Weeknd", pop: 95 },
    { name: "As It Was", artist: "Harry Styles", pop: 92 },
    { name: "Flowers", artist: "Miley Cyrus", pop: 88 },
    { name: "Anti-Hero", artist: "Taylor Swift", pop: 85 },
    { name: "Unholy", artist: "Sam Smith", pop: 80 },
    { name: "Calm Down", artist: "Rema", pop: 75 },
  ];

  const list = items.length
    ? items.slice(0, 6).map((it) => ({
        name: it.name || it.track?.name || "—",
        artist: it.artists?.[0]?.name || it.type || "—",
        pop: it.popularity || Math.floor(Math.random() * 40 + 55),
      }))
    : mock;

  if (loading) return <LoadingState text="Carregando top items..." />;

  return (
    <div style={styles.trackList}>
      {list.map((t, i) => (
        <div key={i} style={styles.trackItem}>
          <span style={styles.trackRank}>{i + 1}</span>
          <TrackIcon />
          <div style={styles.trackInfo}>
            <div style={styles.trackName}>{t.name}</div>
            <div style={styles.trackArtist}>{t.artist}</div>
          </div>
          <div style={{ width: 52, flexShrink: 0 }}>
            <div style={styles.trackBarBg}>
              <div style={{ ...styles.trackBarFill, width: `${t.pop}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SavedTracks({ total, loading }) {
  if (loading)
    return (
      <>
        <Skeleton width={80} height={36} mb={8} />
        <Skeleton width={120} height={12} mb={16} />
        <Skeleton height={80} />
      </>
    );

  const display = total > 999 ? `${(total / 1000).toFixed(1)}k` : total || "2.4k";
  return (
    <div>
      <div style={styles.bigNumber}>{display}</div>
      <div style={styles.bigSub}>músicas na biblioteca</div>
      <div style={styles.trend}>
        <i className="ti ti-trending-up" style={{ fontSize: 13 }} aria-hidden="true" />
        Biblioteca ativa
      </div>
      <div style={styles.metricRow}>
        <div style={styles.metricMini}>
          <div style={styles.mmVal}>{Math.floor(Math.random() * 30 + 10)}</div>
          <div style={styles.mmLabel}>recentes</div>
        </div>
        <div style={styles.metricMini}>
          <div style={styles.mmVal}>{Math.floor(Math.random() * 15 + 5)}</div>
          <div style={styles.mmLabel}>este mês</div>
        </div>
      </div>
    </div>
  );
}

function RecentlyPlayed({ items, loading }) {
  const mock = [
    { name: "Levitating", artist: "Dua Lipa", ago: "3min" },
    { name: "Shivers", artist: "Ed Sheeran", ago: "18min" },
    { name: "Peaches", artist: "Justin Bieber", ago: "42min" },
    { name: "Good 4 U", artist: "Olivia Rodrigo", ago: "1h" },
    { name: "drivers license", artist: "Olivia Rodrigo", ago: "2h" },
  ];

  const list = items.length
    ? items.slice(0, 5).map((it) => ({
        name: (it.track || it).name || "—",
        artist: (it.track || it).artists?.[0]?.name || "—",
        ago: it.played_at ? formatAgo(it.played_at) : "—",
      }))
    : mock;

  if (loading) return <LoadingState text="Buscando histórico..." />;

  return (
    <div style={styles.trackList}>
      {list.map((t, i) => (
        <div key={i} style={styles.recentItem}>
          <div style={styles.recentIcon}>
            <i className={`ti ${rndIcon()}`} style={{ fontSize: 16 }} aria-hidden="true" />
          </div>
          <div style={styles.trackInfo}>
            <div style={styles.trackName}>{t.name}</div>
            <div style={styles.trackArtist}>{t.artist}</div>
          </div>
          <span style={styles.recentTime}>{t.ago}</span>
          <PlayButton label={t.name} />
        </div>
      ))}
    </div>
  );
}

function Recommendations({ tracks, loading }) {
  const mock = [
    { name: "Stay", artist: "The Kid LAROI", score: 88 },
    { name: "Bad Habits", artist: "Ed Sheeran", score: 85 },
    { name: "Industry Baby", artist: "Lil Nas X", score: 82 },
    { name: "Montero", artist: "Lil Nas X", score: 79 },
    { name: "Butter", artist: "BTS", score: 77 },
  ];

  const list = tracks.length
    ? tracks.slice(0, 5).map((t) => ({
        name: t.name || "—",
        artist: t.artists?.[0]?.name || "—",
        score: t.popularity || Math.floor(Math.random() * 30 + 68),
      }))
    : mock;

  if (loading) return <LoadingState text="Gerando sugestões..." />;

  return (
    <div style={styles.trackList}>
      {list.map((t, i) => (
        <div key={i} style={styles.trackItem}>
          <span style={{ ...styles.trackRank, color: "var(--sp-accent)", fontSize: 10 }}>
            {t.score}
          </span>
          <TrackIcon accent />
          <div style={styles.trackInfo}>
            <div style={styles.trackName}>{t.name}</div>
            <div style={styles.trackArtist}>{t.artist}</div>
          </div>
          <PlayButton label={t.name} />
        </div>
      ))}
    </div>
  );
}

function WeeklyActivity({ items, loading }) {
  const mockPcts = [70, 85, 45, 90, 60, 100, 40];
  const counts = items.length ? buildWeeklyCounts(items) : mockPcts;
  const max = Math.max(...counts, 1);
  const total = items.length || 47;

  if (loading)
    return (
      <>
        <Skeleton width={60} height={36} mb={8} />
        <Skeleton width={100} height={12} mb={12} />
        <Skeleton height={80} />
      </>
    );

  return (
    <>
      <div style={styles.bigNumber}>{total}</div>
      <div style={styles.bigSub}>reproduções esta semana</div>
      <div style={styles.barChart}>
        {DAYS.map((d, i) => {
          const h = Math.max(8, Math.round((counts[i] / max) * 100));
          const isMax = counts[i] === max;
          return (
            <div key={d} style={styles.barCol}>
              <div
                style={{
                  ...styles.bar,
                  height: `${h}%`,
                  background: isMax ? "rgba(29,185,84,0.3)" : "var(--sp-subtle)",
                }}
              />
              <div style={styles.barLabel}>{d}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Genres() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
      {GENRES_MOCK.map((g) => (
        <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--sp-muted)", width: 72, flexShrink: 0 }}>
            {g.name}
          </span>
          <div style={{ flex: 1, height: 4, background: "var(--sp-subtle)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${g.pct}%`, background: g.color, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--sp-text)", width: 28, textAlign: "right", fontWeight: 500 }}>
            {g.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

function ResumePlayback() {
  const [status, setStatus] = useState("idle"); // idle | ok | error

  async function handleResume() {
    try {
      await fetch(`${apiFetch("/resume-playback/")}`, { method: "POST" });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  if (status === "ok")
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <i className="ti ti-circle-check" style={{ fontSize: 28, color: "var(--sp-green)" }} aria-hidden="true" />
        <div style={{ fontSize: 13, color: "var(--sp-green)", marginTop: 10, fontWeight: 500 }}>
          Reprodução retomada
        </div>
        <div style={{ fontSize: 11, color: "var(--sp-muted)", marginTop: 4 }}>Confira seu dispositivo</div>
      </div>
    );

  if (status === "error")
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <i className="ti ti-device-mobile-off" style={{ fontSize: 28, color: "var(--sp-muted)" }} aria-hidden="true" />
        <div style={{ fontSize: 13, color: "var(--sp-muted)", marginTop: 10 }}>Nenhum dispositivo ativo</div>
        <div style={{ fontSize: 11, color: "var(--sp-muted)", marginTop: 4, opacity: 0.7 }}>
          Abra o Spotify em algum aparelho
        </div>
      </div>
    );

  return (
    <>
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={styles.playbackIconWrap}>
          <i className="ti ti-player-play" style={{ fontSize: 22, color: "var(--sp-muted)" }} aria-hidden="true" />
        </div>
        <div style={{ fontSize: 13, color: "var(--sp-muted)", marginBottom: 14 }}>Retome de onde parou</div>
        <button onClick={handleResume} style={styles.resumeBtn}>
          <i className="ti ti-player-play" style={{ fontSize: 12 }} aria-hidden="true" />
          Retomar
        </button>
      </div>
      <div style={styles.metricRow}>
        <div style={styles.metricMini}>
          <i className="ti ti-device-mobile" style={{ fontSize: 13, color: "var(--sp-muted)", marginBottom: 4, display: "block" }} aria-hidden="true" />
          <div style={styles.mmVal}>—</div>
          <div style={styles.mmLabel}>dispositivos</div>
        </div>
        <div style={styles.metricMini}>
          <i className="ti ti-list" style={{ fontSize: 13, color: "var(--sp-muted)", marginBottom: 4, display: "block" }} aria-hidden="true" />
          <div style={styles.mmVal}>—</div>
          <div style={styles.mmLabel}>na fila</div>
        </div>
      </div>
    </>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Grid() {
  const [activeNav, setActiveNav] = useState("Visão Geral");
  const [topItems, setTopItems] = useState([]);
  const [savedTotal, setSavedTotal] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [recTracks, setRecTracks] = useState([]);
  const [loading, setLoading] = useState({ top: true, saved: true, recent: true, rec: true });

  const done = (key) => setLoading((p) => ({ ...p, [key]: false }));

  const fetchAll = useCallback(async () => {
    // top items
    fetch(`${apiFetch("/api/auth/top-items/")}`)
      .then((r) => r.json())
      .then((d) => { setTopItems(d.items || d.tracks || d.artists || []); done("top"); })
      .catch(() => done("top"));

    // saved tracks
    fetch(`${apiFetch("/api/auth/saved-tracks/")}`)
      .then((r) => r.json())
      .then((d) => { setSavedTotal(d.total || d.items?.length || 0); done("saved"); })
      .catch(() => done("saved"));

    // recommendations
    fetch(`${apiFetch("/api/auth/recommendations/")}`)
      .then((r) => r.json())
      .then((d) => { setRecTracks(d.tracks || d.items || []); done("rec"); })
      .catch(() => done("rec"));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fmtTotal = (n) => (n > 999 ? `${(n / 1000).toFixed(1)}k` : n ?? "—");

  return (
    <>
      <style>{CSS}</style>
      <div style={styles.dashboard}>

        {/* hero */}
        <div style={styles.hero}>
          <div>
            <h1 style={styles.heroTitle}>
              Seu universo<br />
              <span style={{ color: "var(--sp-green)" }}>musical</span>
            </h1>
            <p style={styles.heroSub}>Dashboard · Dados em tempo real via API</p>
          </div>
          <div style={styles.heroStats}>
            <div style={styles.hstat}>
              <div style={styles.hstatVal}>{fmtTotal(savedTotal)}</div>
              <div style={styles.hstatLabel}>tracks salvas</div>
            </div>
            <div style={styles.hstat}>
              <div style={styles.hstatVal}>{recentItems.length || "—"}</div>
              <div style={styles.hstatLabel}>tocadas recentemente</div>
            </div>
            <div style={styles.hstat}>
              <div style={styles.hstatVal}>{recTracks.length || "—"}</div>
              <div style={styles.hstatLabel}>recomendações</div>
            </div>
          </div>
        </div>

        {/* grid */}
        <div style={styles.grid}>

          <div style={{ ...styles.card, gridColumn: "span 8" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Top Artistas & Músicas</span>
              <span style={styles.cardBadge}>top-items/</span>
            </div>
            <div style={styles.cardBody}>
              <TopItems items={topItems} loading={loading.top} />
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "span 4" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Saved Tracks</span>
              <span style={styles.cardBadge}>saved-tracks/</span>
            </div>
            <div style={styles.cardBody}>
              <SavedTracks total={savedTotal} loading={loading.saved} />
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "span 6" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Recomendações</span>
              <span style={styles.cardBadge}>recommendations/</span>
            </div>
            <div style={styles.cardBody}>
              <Recommendations tracks={recTracks} loading={loading.rec} />
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "span 4" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Atividade Semanal</span>
              <span style={styles.cardBadge}>recently-played/</span>
            </div>
            <div style={styles.cardBody}>
              <WeeklyActivity items={recentItems} loading={loading.recent} />
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "span 4" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Gêneros Favoritos</span>
              <span style={styles.cardBadge}>top-items/</span>
            </div>
            <div style={styles.cardBody}>
              <Genres />
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "span 4" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Retomar Reprodução</span>
              <span style={styles.cardBadge}>resume-playback/</span>
            </div>
            <div style={styles.cardBody}>
              <ResumePlayback />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css');

  :root {
    --sp-green: #1DB954;
    --sp-bg: #0a0a0a;
    --sp-card: #161616;
    --sp-border: rgba(255,255,255,0.07);
    --sp-text: #f0f0f0;
    --sp-muted: #6a6a6a;
    --sp-subtle: #2a2a2a;
    --sp-accent: #e8ff8b;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
`;

const styles = {
  dashboard: {
    minHeight: "100vh",
    background: "var(--sp-bg)",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--sp-text)",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 28px 18px",
    borderBottom: "0.5px solid var(--sp-border)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--sp-green)",
    animation: "pulse 2s infinite",
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 17,
    letterSpacing: -0.5,
    color: "var(--sp-green)",
  },
  navPills: { display: "flex", gap: 6 },
  pill: {
    fontSize: 12,
    padding: "5px 12px",
    borderRadius: 20,
    border: "0.5px solid var(--sp-border)",
    color: "var(--sp-muted)",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    background: "transparent",
    transition: "all .2s",
  },
  pillActive: {
    background: "var(--sp-subtle)",
    color: "var(--sp-text)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  hero: {
    padding: "32px 28px 24px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 42,
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: -1.5,
    color: "var(--sp-text)",
  },
  heroSub: { fontSize: 13, color: "var(--sp-muted)", marginTop: 8, fontWeight: 300 },
  heroStats: { display: "flex", gap: 20 },
  hstat: { textAlign: "right" },
  hstatVal: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: "var(--sp-green)",
  },
  hstatLabel: { fontSize: 11, color: "var(--sp-muted)", marginTop: 1 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 12,
    padding: "0 28px 28px",
  },
  card: {
    background: "var(--sp-card)",
    border: "0.5px solid var(--sp-border)",
    borderRadius: 14,
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px 0",
  },
  cardTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "var(--sp-muted)",
  },
  cardBadge: {
    fontSize: 10,
    padding: "3px 8px",
    borderRadius: 10,
    background: "rgba(29,185,84,0.12)",
    color: "var(--sp-green)",
    border: "0.5px solid rgba(29,185,84,0.25)",
  },
  cardBody: { padding: "14px 18px 18px" },
  trackList: { display: "flex", flexDirection: "column", gap: 6 },
  trackItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 10px",
    borderRadius: 9,
    cursor: "pointer",
  },
  trackRank: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--sp-muted)",
    width: 16,
    textAlign: "center",
    flexShrink: 0,
  },
  trackIcon: {
    width: 34,
    height: 34,
    borderRadius: 6,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  trackInfo: { flex: 1, minWidth: 0 },
  trackName: {
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  trackArtist: {
    fontSize: 11,
    color: "var(--sp-muted)",
    marginTop: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  trackBarBg: { height: 3, background: "var(--sp-subtle)", borderRadius: 2, overflow: "hidden" },
  trackBarFill: { height: "100%", background: "var(--sp-green)", borderRadius: 2 },
  bigNumber: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: -1,
    lineHeight: 1,
  },
  bigSub: { fontSize: 12, color: "var(--sp-muted)", marginTop: 5 },
  trend: { display: "flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 12, color: "var(--sp-green)" },
  metricRow: { display: "flex", gap: 10, marginTop: 14 },
  metricMini: { flex: 1, background: "var(--sp-subtle)", borderRadius: 9, padding: "10px 12px" },
  mmVal: { fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700 },
  mmLabel: { fontSize: 10, color: "var(--sp-muted)", marginTop: 2 },
  barChart: { display: "flex", alignItems: "flex-end", gap: 5, height: 80, marginTop: 12 },
  barCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  bar: { width: "100%", borderRadius: "4px 4px 0 0" },
  barLabel: { fontSize: 9, color: "var(--sp-muted)" },
  recentItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 8px",
    borderRadius: 8,
    cursor: "pointer",
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    flexShrink: 0,
    background: "var(--sp-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--sp-muted)",
  },
  recentTime: { fontSize: 10, color: "var(--sp-muted)", flexShrink: 0 },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "var(--sp-green)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  loadingState: { display: "flex", alignItems: "center", gap: 8, color: "var(--sp-muted)", fontSize: 12, padding: "12px 0" },
  playbackIconWrap: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "var(--sp-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
  },
  resumeBtn: {
    background: "var(--sp-green)",
    color: "#000",
    border: "none",
    borderRadius: 22,
    padding: "8px 22px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
};
import { useState, useEffect, useCallback } from "react";
import { withApiBase } from "../../utils/apiBase";
import { apiFetch } from "../../utils/appClient";
// import styles from '.style.module.css';

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

function formatDuration(ms) {
  if (ms === null || ms === undefined) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "—";

  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diffMs)) return "—";

  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return "agora";
  if (totalMinutes < 60) return `${totalMinutes}min`;

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h`;

  return `${Math.floor(totalHours / 24)}d`;
}

function normalizeArtists(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((artist) => {
      if (typeof artist === "string") return artist;
      return artist?.name;
    })
    .filter(Boolean);
}

function normalizeRecentlyPlayed(items) {
  const source = Array.isArray(items) ? items : Object.values(items || {});

  return source.slice(0, 5).map((item, index) => {
    const track = item?.track || item || {};
    const artists = normalizeArtists(track.artists);
    const album = track.album || {};

    return {
      id: item?.played_at || track.id || track.uri || `${index}-${track.name || "recent"}`,
      name: track.name || "—",
      artist: artists.join(", ") || "—",
      album: album.name || "—",
      albumType: album.album_type || track.type || "—",
      image: album.images?.[0]?.url || track.image_url || "",
      duration: formatDuration(track.duration_ms),
      explicit: Boolean(track.explicit),
      addedAt: item?.added_at || null,
      playedAt: item?.played_at || item?.added_at || null,
      trackNumber: track.track_number,
      discNumber: track.disc_number,
      uri: track.uri || "",
      spotifyUrl: track.external_urls?.spotify || track.spotify_url || "",
      isPlayable: track.is_playable,
    };
  });
}

function normalizeSavedTracks(items) {
  const source = Array.isArray(items) ? items : Object.values(items || {});

  return source.slice(0, 12).map((item, index) => {
    const track = item?.track || item || {};
    const artists = normalizeArtists(track.artists);
    const album = track.album || {};

    return {
      id: item?.added_at || track.id || track.uri || `${index}-${track.name || "saved"}`,
      name: track.name || "—",
      artist: artists.join(", ") || "—",
      album: album.name || "—",
      albumType: album.album_type || track.type || "—",
      image: album.images?.[0]?.url || track.image_url || "",
      duration: formatDuration(track.duration_ms),
      explicit: Boolean(track.explicit),
      addedAt: item?.added_at || null,
      trackNumber: track.track_number,
      discNumber: track.disc_number,
      popularity: Number(track.popularity ?? 0),
      isPlayable: track.is_playable,
      spotifyUrl: track.external_urls?.spotify || track.spotify_url || "",
    };
  });
}

function normalizeTopItems(items) {
  const source = Array.isArray(items) ? items : Object.values(items || {});

  return source.slice(0, 6).map((it, index) => {
    const track = it?.track || it || {};
    const artists = Array.isArray(track.artists)
      ? track.artists
          .map((artist) => (typeof artist === "string" ? artist : artist?.name))
          .filter(Boolean)
      : [];

    const plays = Number(track.plays ?? track.popularity ?? track.score ?? 0);
    const rank = track.rank ?? index + 1;

    return {
      id: track.id || track.uri || track.spotify_url || `${rank}-${track.name || "item"}`,
      name: track.name || "—",
      artist: artists.join(", ") || track.artist || track.type || "—",
      album: track.album?.name || track.album || "—",
      image: track.image_url || track.album?.images?.[0]?.url || "",
      duration: formatDuration(track.duration_ms),
      explicit: Boolean(track.explicit),
      plays: Number.isFinite(plays) ? plays : 0,
      rank,
      url: track.spotify_url || track.uri || "",
    };
  });
}


function TopItems({ items, loading }) {
  const mock = [
    {
      name: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      duration: "3:20",
      plays: 95,
      rank: 1,
    },
    {
      name: "As It Was",
      artist: "Harry Styles",
      album: "Harry's House",
      duration: "2:47",
      plays: 92,
      rank: 2,
    },
    {
      name: "Flowers",
      artist: "Miley Cyrus",
      album: "Endless Summer Vacation",
      duration: "3:20",
      plays: 88,
      rank: 3,
    },
    {
      name: "Anti-Hero",
      artist: "Taylor Swift",
      album: "Midnights",
      duration: "3:20",
      plays: 85,
      rank: 4,
    },
    {
      name: "Unholy",
      artist: "Sam Smith",
      album: "Gloria",
      duration: "2:37",
      plays: 80,
      rank: 5,
    },
    {
      name: "Calm Down",
      artist: "Rema",
      album: "Rave & Roses",
      duration: "3:59",
      plays: 75,
      rank: 6,
    },
  ];

  const normalized = normalizeTopItems(items);
  const list = normalized.length ? normalized : mock;

  if (loading) return <LoadingState text="Carregando top items..." />;

  return (
    <div style={styles.trackList}>
      {list.map((t, i) => (
        <div key={t.id || i} style={styles.trackItem}>
          <span
            style={{
              ...styles.trackRank,
              color:
                i === 0
                  ? "#FFD700"
                  : i === 1
                    ? "#C0C0C0"
                    : i === 2
                      ? "#CD7F32"
                      : "var(--sp-muted)",
            }}
          >
              {t.rank || i + 1}
          </span>

          <div style={styles.fallbackCover}>
              {t.image ? (
                <img src={t.image} alt="" style={styles.coverImage} />
              ) : (
                <TrackIcon />
              )}
          </div>

          <div style={styles.trackInfo}>
            <div style={styles.trackName}>
              {t.name}
            </div>

            <div style={styles.trackArtist}>
              {t.artist}
            </div>

            <div style={styles.trackMetaRow}>
              <span style={styles.trackMetaPill}>{t.album}</span>
              <span style={styles.trackMetaPill}>{t.duration}</span>
              {t.explicit && <span style={styles.trackMetaExplicit}>E</span>}
            </div>
          </div>

          <div style={styles.popularityContainer}>
            <div style={styles.popularityText}>
              {t.plays} plays
            </div>

            <div style={styles.trackBarBg}>
              <div
                style={{
                  ...styles.trackBarFill,
                  width: `${Math.max(8, Math.min(100, t.plays || 0))}%`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SavedTracks({ total, items, loading }) {
  const mock = [
    {
      name: "Beauty Of Annihilation",
      artist: "Elena Siegman, Kevin Sherwood, Brian Tuey",
      album: "Call of Duty: Black Ops – Zombies (Original Game Soundtrack)",
      duration: "4:28",
      addedAt: "22 Jan",
      explicit: false,
    },
    {
      name: "so obsessed",
      artist: "coldwntr, humanendeavour",
      album: "she doesn't know these songs are about her",
      duration: "2:00",
      addedAt: "11 Nov",
      explicit: false,
    },
    {
      name: "Lovestory",
      artist: "h4rtbrkr, DethTech",
      album: "h4rtbrkr",
      duration: "1:55",
      addedAt: "01 Oct",
      explicit: false,
    },
    {
      name: "Godzilla (feat. Juice WRLD)",
      artist: "Eminem, Juice WRLD",
      album: "Music To Be Murdered By",
      duration: "3:30",
      addedAt: "24 Mar",
      explicit: true,
    },
  ];

  const normalized = normalizeSavedTracks(items);
  const list = normalized.length ? normalized : mock;

  if (loading)
    return (
      <>
        <Skeleton width={80} height={36} mb={8} />
        <Skeleton width={120} height={12} mb={16} />
        <Skeleton height={180} />
      </>
    );

  const savedTotal = typeof total === "number" ? total : total?.total || total?.items?.length || 0;
  const display = savedTotal > 999 ? `${(savedTotal / 1000).toFixed(1)}k` : savedTotal || "2.4k";
  return (
    <div>
      <div style={styles.bigNumber}>{display}</div>
      <div style={styles.bigSub}>músicas na biblioteca</div>
      <div style={styles.trend}>
        <i className="ti ti-trending-up" style={{ fontSize: 13 }} aria-hidden="true" />
        Biblioteca ativa
      </div>
      <div style={styles.savedListWrap}>
        {list.map((track, index) => (
          <div key={track.id || index} style={styles.savedRow}>
            <div style={styles.savedCover}>
              {track.image ? <img src={track.image} alt="" style={styles.savedCoverImage} /> : <TrackIcon />}
            </div>

            <div style={styles.trackInfo}>
              <div style={styles.trackName}>{track.name}</div>
              <div style={styles.trackArtist}>{track.artist}</div>
              <div style={styles.trackMetaRow}>
                <span style={styles.trackMetaPill}>{track.album}</span>
                <span style={styles.trackMetaPill}>{track.duration}</span>
                <span style={styles.trackMetaPill}>{track.addedAt || "sem data"}</span>
                {track.explicit && <span style={styles.trackMetaExplicit}>E</span>}
              </div>
            </div>

            <div style={styles.savedRight}>
              <span style={styles.savedIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span style={styles.savedType}>{track.albumType}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentlyPlayed({ items, loading }) {
  const mock = [
    {
      name: "Beauty Of Annihilation",
      artist: "Elena Siegman, Kevin Sherwood, Brian Tuey",
      album: "Call of Duty: Black Ops – Zombies (Original Game Soundtrack)",
      duration: "4:28",
      ago: "3h",
      addedAt: "22 Jan",
    },
    {
      name: "so obsessed",
      artist: "coldwntr, humanendeavour",
      album: "she doesn't know these songs are about her",
      duration: "2:00",
      ago: "1d",
      addedAt: "11 Nov",
    },
    {
      name: "Lovestory",
      artist: "h4rtbrkr, DethTech",
      album: "h4rtbrkr",
      duration: "1:55",
      ago: "9mo",
      addedAt: "01 Oct",
    },
    {
      name: "Godzilla (feat. Juice WRLD)",
      artist: "Eminem, Juice WRLD",
      album: "Music To Be Murdered By",
      duration: "3:30",
      ago: "3mo",
      addedAt: "24 Mar",
    },
  ];

  const normalized = normalizeRecentlyPlayed(items);
  const list = normalized.length ? normalized : mock;

  if (loading) return <LoadingState text="Buscando histórico..." />;

  return (
    <div style={styles.trackList}>
      {list.map((t, i) => (
        <div key={t.id || i} style={styles.recentItem}>
          <div style={styles.recentCover}>
            {t.image ? <img src={t.image} alt="" style={styles.recentCoverImage} /> : <TrackIcon />}
          </div>
          <div style={styles.trackInfo}>
            <div style={styles.trackName}>{t.name}</div>
            <div style={styles.trackArtist}>{t.artist}</div>
            <div style={styles.trackMetaRow}>
              <span style={styles.trackMetaPill}>{t.album}</span>
              <span style={styles.trackMetaPill}>{t.duration}</span>
              <span style={styles.trackMetaPill}>{t.albumType}</span>
              {t.explicit && <span style={styles.trackMetaExplicit}>E</span>}
            </div>
          </div>
          <div style={styles.recentStack}>
            <span style={styles.recentTime}>{t.ago || formatRelativeTime(t.playedAt)}</span>
            <span style={styles.recentDate}>{t.addedAt ? `adicionado ${formatDateLabel(t.addedAt)}` : ""}</span>
          </div>
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
  console.log("WeeklyActivity counts:", counts, "total:", total);
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
function calculateGenres(artists) {
  const counter = {};

  artists.forEach((artist) => {
    (artist.genres || []).forEach((genre) => {
      counter[genre] = (counter[genre] || 0) + 1;
    });
  });

  const total = Object.values(counter)
    .reduce((a, b) => a + b, 0);

  return Object.entries(counter)
    .map(([name, count]) => ({
      name,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);
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
  const [status, setStatus] = useState("idle");

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

export default function Grid() {
  const [activeNav, setActiveNav] = useState("Visão Geral");
  const [topItems, setTopItems] = useState([]);
  const [topGenres, setTopGenres] = useState([]);
  const [savedTotal, setSavedTotal] = useState(null);
  const [savedItems, setSavedItems] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [recTracks, setRecTracks] = useState([]);
  const [loading, setLoading] = useState({
    top: true,
    saved: true,
    recent: true,
  });

  const token = localStorage.getItem("token");

  const done = (key) =>
    setLoading((prev) => ({
      ...prev,
      [key]: false,
    }));

  const fetchAll = useCallback(async () => {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const [topRes, savedRes, recentRes] = await Promise.allSettled([
        apiFetch("/api/auth/top-items/"),
        apiFetch("/api/auth/saved-tracks/"),
        apiFetch("/api/auth/recently-played/"),
      ]);

      if (topRes.status === "fulfilled") {
        const response = topRes.value;
        if (response.ok) {
          const data = await response.json();
          setTopItems(data.items || data.tracks || data.artists || []);
        } else {
          const text = await response.text();
          console.error("Erro em top-items:", text);
        }
      } else {
        console.error("Falha na requisição top-items:", topRes.reason);
      }
      done("top");

      if (recentRes.status === "fulfilled") {
        const response = recentRes.value;

        if (response.ok) {
          const data = await response.json();
          setRecentItems(data.items || []);
        } else {
          const text = await response.text();
          console.error("Erro em recently-played:", text);
        }
      } else {
        console.error("Falha na requisição recently-played:", recentRes.reason);
      }
      done("recent");

      if (savedRes.status === "fulfilled") {
        const response = savedRes.value;
        if (response.ok) {
          const data = await response.json();
          setSavedTotal(data.total || data.items?.length || 0);
          setSavedItems(data.items || []);
        } else {
          const text = await response.text();
          console.error("Erro em saved-tracks:", text);
        }
      } else {
        console.error("Falha na requisição saved-tracks:", savedRes.reason);
      }
      done("saved");

    } catch (err) {
      console.error("Erro geral no carregamento:", err);
      // Em caso de erro inesperado, marque todos como concluídos para não travar a UI
      done("top");
      done("saved");
      done("genres");
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fmtTotal = (n) => (n > 999 ? `${(n / 1000).toFixed(1)}k` : n ?? "—");

  return (
    <>
      <style>{CSS}</style>
      <div className="page-bg sp-root" style={styles.dashboard}>

        <div className={styles['sp-orb']} aria-hidden="true" />
        <div className={styles['sp-orb-1']} aria-hidden="true" />
        <div className={styles['sp-orb-2']} aria-hidden="true" />
        <div className={styles['sp-noise']} aria-hidden="true" />

        {/* hero */}
        <div style={styles.hero}>
          <div className="sp-hero-copy">
            <div className="sp-eyebrow" aria-hidden="true">
              <span className="sp-eyebrow-dot" />
              <span className="sp-eyebrow-label">Spotify conectado</span>
            </div>

            <h1 className="sp-headline">
              Seu Universo <span className="sp-headline-muted"> Músical</span>
            </h1>
            <p className="sp-subline">Tudo pronto para explorar o seu gosto músical</p>
          </div>

          <div style={styles.heroStats} className="sp-hero-stats">
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

          <div style={{ ...styles.card, gridColumn: "span 7" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Top Músicas mais ouvidas</span>
              <span style={styles.cardBadge}>top-items/</span>
            </div>
            <div style={styles.cardBody}>
              <TopItems items={topItems} loading={loading.top} />
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "span 5" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Saved Tracks</span>
              <span style={styles.cardBadge}>saved-tracks/</span>
            </div>
            <div style={styles.cardBody}>
              <SavedTracks total={savedTotal} items={savedItems} loading={loading.saved} />
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "span 6" }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Atividades recentes</span>
              <span style={styles.cardBadge}>recently-played/</span>
            </div>
            <div style={styles.cardBody}>
              <WeeklyActivity items={recentItems} loading={loading.recent} />
            </div>
          </div>

          <div style={{ ...styles.card, gridColumn: "span 6" }}>
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

  .sp-hero-copy {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 640px;
  }

  .sp-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--sp-border);
    color: var(--sp-muted);
    font-size: 11px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .sp-eyebrow-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--sp-green);
    box-shadow: 0 0 0 6px rgba(29, 185, 84, 0.12);
  }

  .sp-eyebrow-label {
    font-weight: 600;
    color: var(--sp-text);
  }

  .sp-headline {
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 900;
  color: #fff;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
    
  }

  .sp-headline-muted {
    color: var(--sp-green);
  }

  .sp-subline {
    color: var(--sp-muted);
    font-size: 14px;
    line-height: 1.6;
    max-width: 42ch;
    margin: 0;
  }

  .sp-hero-stats {
    backdrop-filter: blur(10px);
  }

  @media (max-width: 1024px) {
    .sp-root {
      padding: 16px 16px 72px;
    }

    .sp-headline {
      font-size: clamp(2.2rem, 8vw, 3.4rem);
    }

    .sp-hero-stats {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }

  @media (max-width: 720px) {
    .sp-hero-copy {
      max-width: 100%;
    }

    .sp-eyebrow {
      font-size: 10px;
    }

    .sp-hero-stats {
      gap: 12px;
    }

    .sp-hero-stats > div {
      min-width: calc(50% - 6px);
    }
  }
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
  "sp-root": {

  background: "#000",
  /* /* min-height: 100vh;  */
  /* max-height: 200vh; */
  padding: "20px 24px 80px",

  position: "relative",
  overflow: "hidden"
  },
  "sp-orb": {
    position: "absolute",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  "sp-orb-1": {
    position: "absolute",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(29, 185, 84, 0.18) 0%, transparent 70%)",
    top: "-160px",
    right: "-120px",
  },
  "sp-orb-2": {
    position: "absolute",
    width: "350px",
    height: "350px",
    background: "radial-gradient(circle, rgba(29, 185, 84, 0.09) 0%, transparent 70%)",
    bottom: 0,
    left: "-80px",
  },
  "sp-noise": {
    position: "absolute",
    inset: 0,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
    opacity: 0.025,
    pointerEvents: "none",
  },
  "sp-inner": {
    maxWidth: "860px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
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
  navPills: {
    display: "flex",
    gap: 6,
  },
  "page-bg": {
  position: "relative",
  overflow: "hidden",
},
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
    minWidth: "70%",
    maxWidth: "80%",
    margin: "auto",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 24,
    flexWrap: "wrap",
  },
  heroTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 42,
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: -1.5,
    color: "var(--sp-text)",
  },
  heroSub: {
    fontSize: 13,
    color: "var(--sp-muted)",
    marginTop: 8,
    fontWeight: 300,
  },
  heroStats: {
    display: "flex",
    gap: 20,
  },
  hstat: {
    textAlign: "right",
  },
  hstatVal: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: "var(--sp-green)",
  },
  hstatLabel: {
    fontSize: 11,
    color: "var(--sp-muted)",
    marginTop: 1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    width: "80%",
    maxWidth: "1400px",
    margin: "auto",
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
  cardBody: {
    padding: "14px 18px 18px",
  },
  trackList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  trackItem: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "var(--sp-surface)",
    border: "1px solid var(--sp-border)",
    transition: "all 0.2s ease",
  },
  trackRank: {
    width: "28px",
    textAlign: "center",
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "var(--sp-muted)",
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
  fallbackCover: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
    background: "var(--sp-subtle)",
    border: "1px solid var(--sp-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackName: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--sp-text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  trackArtist: {
    fontSize: "0.8rem",
    color: "var(--sp-muted)",
    marginTop: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  trackMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 6,
  },
  trackMetaPill: {
    fontSize: 10,
    lineHeight: 1,
    padding: "4px 7px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--sp-border)",
    color: "var(--sp-muted)",
  },
  trackMetaExplicit: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1,
    padding: "4px 6px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "var(--sp-text)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  popularityContainer: {
    width: "96px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flexShrink: 0,
  },
  popularityText: {
    fontSize: "0.72rem",
    color: "var(--sp-muted)",
    textAlign: "right",
  },
  trackBarBg: {
    height: 4,
    background: "var(--sp-subtle)",
    borderRadius: 2,
    overflow: "hidden",
  },
  trackBarFill: {
    height: "100%",
    background: "var(--sp-green)",
    borderRadius: 2,
  },
  bigNumber: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: -1,
    lineHeight: 1,
  },
  bigSub: {
    fontSize: 12,
    color: "var(--sp-muted)",
    marginTop: 5,
  },
  trend: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    fontSize: 12,
    color: "var(--sp-green)",
  },
  metricRow: {
    display: "flex",
    gap: 10,
    marginTop: 14,
  },
  metricMini: {
    flex: 1,
    background: "var(--sp-subtle)",
    borderRadius: 9,
    padding: "10px 12px",
  },
  savedListWrap: {
    marginTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 520,
    overflowY: "auto",
    paddingRight: 6,
  },
  savedRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid var(--sp-border)",
  },
  savedCover: {
    width: 42,
    height: 42,
    borderRadius: 10,
    flexShrink: 0,
    overflow: "hidden",
    background: "var(--sp-subtle)",
    border: "1px solid var(--sp-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  savedCoverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  savedRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
    flexShrink: 0,
  },
  savedIndex: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: "var(--sp-green)",
    lineHeight: 1,
  },
  savedType: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "var(--sp-muted)",
  },
  mmVal: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 17,
    fontWeight: 700,
  },
  mmLabel: {
    fontSize: 10,
    color: "var(--sp-muted)",
    marginTop: 2,
  },
  barChart: {
    display: "flex",
    alignItems: "flex-end",
    gap: 5,
    height: 80,
    marginTop: 12,
  },
  barCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  bar: {
    width: "100%",
    borderRadius: "4px 4px 0 0",
  },
  barLabel: {
    fontSize: 9,
    color: "var(--sp-muted)",
  },
  recentItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 8px",
    borderRadius: 8,
    cursor: "pointer",
  },
  recentCover: {
    width: 42,
    height: 42,
    borderRadius: 10,
    flexShrink: 0,
    background: "var(--sp-subtle)",
    border: "1px solid var(--sp-border)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--sp-muted)",
  },
  recentCoverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  recentStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  recentTime: {
    fontSize: 10,
    color: "var(--sp-muted)",
    flexShrink: 0,
  },
  recentDate: {
    fontSize: 9,
    color: "var(--sp-muted)",
    opacity: 0.8,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
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
  loadingState: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--sp-muted)",
    fontSize: 12,
    padding: "12px 0",
  },
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
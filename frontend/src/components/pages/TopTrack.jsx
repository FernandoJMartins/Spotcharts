import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/appClient";

const PERIOD_TABS = [
    { key: "short", label: "4 semanas" },
    { key: "medium", label: "6 meses" },
    { key: "long", label: "Histórico" },
];

const PERIOD_LABELS = {
    short: "últimas 1 mês",
    medium: "últimos 6 meses",
    long: "histórico geral",
};

function TrackArt({ name }) {
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

    const hue = (name.charCodeAt(0) * 37) % 360;

    return (
        <div
            className="w-11 h-11 rounded flex-shrink-0 flex items-center justify-center text-sm font-bold"
            style={{
                background: `hsl(${hue}, 55%, 20%)`,
                color: `hsl(${hue}, 75%, 70%)`,
            }}
        >
            {initials}
        </div>
    );
}

function MetaBadge({ label, value }) {
    return (
        <span className="bg-zinc-800 border border-zinc-600 rounded-full px-3 py-1 text-xs text-zinc-400">
            {label}:{" "}
            <strong className="text-white font-semibold">{value}</strong>
        </span>
    );
}

function PopularityBar({ value = 70 }) {
    return (
        <div className="w-12 h-0.5 bg-zinc-600 rounded-full overflow-hidden flex-shrink-0">
            <div
                className="h-full bg-[#1DB954] rounded-full transition-all duration-500"
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

function TrackItem({ track, index }) {
    const [hovered, setHovered] = useState(false);

    return (
        <li
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 cursor-pointer"
            style={{ background: hovered ? "#282828" : "transparent" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="w-5 m-auto flex-shrink-0 flex items-cenbter justify-center">
                {hovered ? (
                    <span className="text-white text-xs">▶</span>
                ) : (
                    <span className="text-zinc-500 text-sm font-medium tabular-nums">
                        {index + 1}
                    </span>
                )}
            </div>

            <TrackArt name={track.name} />

            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{track.name}</p>
                <p className="text-zinc-400 text-xs truncate">
                    {track.artists.join(", ")}
                </p>
            </div>

            <PopularityBar value={track.popularity} />
        </li>
    );
}

export default function TopTracks() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState("short");

    useEffect(() => {
        setLoading(true);
        setError(null);

        apiFetch(`/api/auth/top-tracks/?period=${period}&limit=10`)
            .then((res) => {
                if (!res.ok) throw new Error("Erro ao buscar top tracks");
                return res.json();
            })
            .then(setData)
            .catch((err) => setError(err.message || "Erro desconhecido"))
            .finally(() => setLoading(false));
    }, [period]);

    return (
<div className="relative z-10 w-full max-w-6xl flex flex-col gap-6">       
            <div
                aria-hidden="true"
                className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#1DB954] opacity-20 blur-3xl pointer-events-none"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-purple-700 opacity-15 blur-3xl pointer-events-none"
            />

            <div className="relative z-10 max-w-xl w-full mx-auto flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col gap-3">
                    <p className="text-[#1DB954] text-xs font-semibold tracking-widest uppercase">
                        ● SpotifyCharts
                    </p>

                    <h1 className="text-4xl font-black text-white leading-tight">
                        Suas faixas{" "}
                        <span className="text-[#1DB954]">mais tocadas.</span>
                    </h1>

                    {data && (
                        <div className="flex flex-wrap gap-2">
                            <MetaBadge label="Modo" value={data.mode} />
                            <MetaBadge label="Período" value={PERIOD_LABELS[period]} />
                            <MetaBadge label="Total" value={data.count} />
                        </div>
                    )}
                </div>

                {/* Period tabs */}
                <div className="flex gap-1">
                    {PERIOD_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setPeriod(tab.key)}
                            className={[
                                "px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors duration-150",
                                period === tab.key
                                    ? "bg-zinc-800 text-white"
                                    : "text-zinc-500 hover:text-white",
                            ].join(" ")}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* States */}
                {loading && (
                    <p className="text-zinc-500 text-sm text-center py-10">
                        Carregando...
                    </p>
                )}
                {error && (
                    <p className="text-red-400 text-sm text-center py-10">
                        Erro: {error}
                    </p>
                )}

                {/* Track list */}
                {!loading && !error && data && (
                    <ul className="flex flex-col flex-1 gap-0.5 list-none overflow-y-auto">
                        {data.items.map((track, i) => (
                            <TrackItem key={track.id} track={track} index={i} />
                        ))}
                    </ul>
                )}
                {/* Footer */}
                <p className="text-zinc-600 text-xs text-center tracking-wide mt-4">
                    SpotifyCharts © 2026 • Dados &amp; Visualizações
                </p>

            </div>
        </div>
    );
}
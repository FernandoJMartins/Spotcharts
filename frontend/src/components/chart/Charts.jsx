import { useEffect, useState } from "react";
import { Disc3, Music2 } from "lucide-react";
import { withApiBase } from "../../utils/apiBase";

const DEFAULT_LIMIT = 25;
const numberFormatter = new Intl.NumberFormat("pt-BR");

const TYPE_OPTIONS = [
  {
    value: "albums",
    label: "Albuns",
    icon: Disc3,
  },
  {
    value: "tracks",
    label: "Musicas",
    icon: Music2,
  },
];

const PERIOD_OPTIONS = [
  { value: "short", label: "4 semanas" },
  { value: "medium", label: "6 meses" },
  { value: "long", label: "Todos" },
];

/**
 * @typedef {Object} DashboardItem
 * @property {string} id
 * @property {string} name
 * @property {string[]} artists
 * @property {string | null} image_url
 * @property {number} plays
 * @property {string} uri
 * @property {"track" | "album"} type
 * @property {number} rank
 */

const formatPlays = (value) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return numberFormatter.format(safeValue);
};

function DashboardCard({ item }) {
  const artists = (item.artists || [])
    .filter(Boolean)
    .join(", ") || "Artista desconhecido";

  return (

    <div className="card reveal-scale">
      <div className="relative mb-4">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-[100px] h-[100px] aspect-square object-cover rounded-lg"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-square rounded-lg bg-[var(--color-border-subtle)] flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
            Sem capa
          </div>
        )}

        <div className="absolute top-3 left-3 bg-black/70 text-xs px-2 py-1 rounded-full">
          #{item.rank}
        </div>
      </div>
      <div className="flex flex-col flex-1">
        <h3 className="text-base sm:text-lg font-semibold " title={item.name}>
          {item.name}
        </h3>

        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] truncate" title={artists}>
          {artists}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs sm:text-sm">
          <span className="text-[var(--color-text-secondary)]">Plays</span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            {formatPlays(item.plays)}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="relative mb-4">
        <div className="skeleton w-[100px] h-[100px] rounded-lg" />
        <div className="skeleton absolute top-3 left-3 h-5 w-10 rounded-full" />
      </div>
      <div className="flex flex-col flex-1">
        <div className="skeleton h-4 rounded mb-2 w-3/4" />
        <div className="skeleton h-3 rounded w-1/2" />
        <div className="mt-4 flex items-center justify-between">
          <div className="skeleton h-3 rounded w-16" />
          <div className="skeleton h-4 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export default function Charts() {
  const [itemType, setItemType] = useState("albums");
  const [period, setPeriod] = useState("short");
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = async (nextOffset, append, signal) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Sessao expirada. Faça login novamente.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const url = withApiBase(
      `/api/auth/top-items/?type=${itemType}&period=${period}&limit=${DEFAULT_LIMIT}&offset=${nextOffset}`
    );

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!res.ok) {
      throw new Error("Falha ao carregar dados do Spotify.");
    }

    const data = await res.json();
    const received = data.items || [];
    const nextTotal = Number.isFinite(data.total) ? data.total : received.length;

    setItems((prev) => (append ? [...prev, ...received] : received));
    setOffset(nextOffset + received.length);
    setTotal(nextTotal);
  };

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");
    setItems([]);
    setOffset(0);
    setTotal(null);

    fetchItems(0, false, controller.signal)
      .catch((err) => {
        if (err.name === "AbortError") {
          return;
        }

        setError(err.message || "Erro ao carregar dados.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [itemType, period]);

  const handleLoadMore = async () => {
    if (loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError("");

    try {
      await fetchItems(offset, true);
    } catch (err) {
      setError(err.message || "Erro ao carregar mais dados.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    setError("");

    try {
      await fetchItems(0, false);
    } catch (err) {
      setError(err.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const hasMore = total !== null && offset < total;
  const emptyLabel = itemType === "albums"
    ? "Nenhum album encontrado para este periodo."
    : "Nenhuma musica encontrada para este periodo.";

  return (
    <div className="page-bg bg-[var(--color-bg-elevated)] min-h-screen">
      <div className="hero-ornaments" aria-hidden="true">
        <div className="hero-orb orb-1" />
        <div className="hero-orb orb-2" />
        <div className="hero-grid" />
      </div>

      <div className="mx-auto px-4 py-12 sm:py-16 relative z-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:gap-8 mb-8 sm:mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 text-center">
              Dashboard
            </h1>

            <p className="text-center">
              Seus albums e musicas mais escutados em um so lugar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="flex flex-wrap items-center justify-center sm:justify-start bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-full p-1 w-full sm:w-auto">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = itemType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setItemType(option.value)}
                    className={
                      active
                        ? "px-4 py-2 rounded-full bg-[var(--color-spotify-green)] text-black text-sm font-semibold flex items-center gap-2 flex-1 sm:flex-none justify-center"
                        : "px-4 py-2 rounded-full text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-2 flex-1 sm:flex-none justify-center"
                    }
                  >
                    <Icon size={16} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-full p-1 w-full sm:w-auto">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={
                    period === option.value
                      ? "px-4 py-2 rounded-full bg-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm flex-1 sm:flex-none text-center"
                      : "px-4 py-2 rounded-full text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex-1 sm:flex-none text-center"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 text-xs sm:text-sm text-[var(--color-text-secondary)]">
          <span>
            {total !== null ? `${total} itens encontrados` : "Carregando dados"}
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-[var(--color-error)] bg-[rgba(239,68,68,0.1)] text-[var(--color-error)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-4 sm:gap-5 lg:gap-6">
            {Array.from({ length: DEFAULT_LIMIT }).map((_, index) => (
              <SkeletonCard key={`skeleton-${index}`} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card text-center py-12 sm:py-16">
            <p className="text-[var(--color-text-secondary)] mb-4 text-sm sm:text-base">
              {emptyLabel}
            </p>
            <button
              type="button"
              className="btn-secondary px-6 py-3 w-full sm:w-auto"
              onClick={handleRetry}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:gap-5 lg:gap-6">
            {items.map((item) => (
              <DashboardCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              className="btn-secondary px-8 py-3 w-full sm:w-auto"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Carregando..." : "Ver mais"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-elevated)]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 mb-4">
          <div className="w-8 h-8 border-3 border-[var(--color-spotify-green)] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[var(--color-text-secondary)]">Carregando...</p>
      </div>
    </div>
  );
}
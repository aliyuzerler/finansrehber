interface ErrorBoxProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  return (
    <div className="border border-down/50 bg-down/10 p-4">
      <p className="font-mono text-xs uppercase tracking-widest text-down">Hata</p>
      <p className="mt-1 text-sm text-ink">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 border border-accent bg-accent px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-dim"
        >
          Yeniden Dene
        </button>
      )}
    </div>
  );
}

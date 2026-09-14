import { BrandLogo } from "@/components/ui/BrandLogo";
import { ErrorState } from "@/components/chat/ErrorState";

interface ConnectingScreenProps {
  status: "connecting" | "error";
  errorMessage?: string;
  onRetry?: () => void;
}

export function ConnectingScreen({ status, errorMessage, onRetry }: ConnectingScreenProps) {
  return (
    <main className="app-gradient-bg flex h-dvh flex-col">
      {status === "connecting" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <BrandLogo size="lg" glow />
          <div>
            <p className="text-sm font-semibold text-text-primary">M11 Group</p>
            <p className="mt-1 text-xs text-text-secondary">Preparing your chat…</p>
          </div>
        </div>
      ) : (
        <ErrorState message={errorMessage || "Unable to connect to chat."} onRetry={onRetry} />
      )}
    </main>
  );
}
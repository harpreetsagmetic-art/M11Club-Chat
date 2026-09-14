import { BrandLogo } from "@/components/ui/BrandLogo";
import { Badge } from "@/components/ui/Badge";
import type { ChatUser } from "@/types/chat";

export function ChatHeader({ user }: { user: ChatUser }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
      <BrandLogo size="sm" />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-text-primary">M11 Group</div>
        <div className="flex items-center gap-1.5 truncate text-xs text-text-secondary">
          <span className="truncate">{user.displayName}</span>
          {user.role === "admin" && <Badge>Admin</Badge>}
        </div>
      </div>
    </header>
  );
}
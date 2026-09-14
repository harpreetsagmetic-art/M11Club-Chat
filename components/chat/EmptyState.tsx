export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-2xl">
        💬
      </div>
      <p className="text-sm font-medium text-text-primary">No messages yet</p>
      <p className="max-w-[220px] text-xs text-text-secondary">
        Be the first to say something in the group.
      </p>
    </div>
  );
}

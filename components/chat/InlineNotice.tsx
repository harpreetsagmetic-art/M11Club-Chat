export function InlineNotice({ message }: { message: string }) {
  return (
    <div className="shrink-0 border-t border-danger/20 bg-danger/10 px-4 py-2 text-xs text-danger">
      {message}
    </div>
  );
}

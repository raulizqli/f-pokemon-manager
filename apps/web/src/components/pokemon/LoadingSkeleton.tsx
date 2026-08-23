export function LoadingSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-poke-dark/10 bg-white p-4">
          <div className="mx-auto h-24 w-24 rounded-full bg-poke-dark/10" />
          <div className="mt-4 h-4 rounded bg-poke-dark/10" />
          <div className="mt-2 h-3 w-2/3 mx-auto rounded bg-poke-dark/10" />
        </div>
      ))}
    </div>
  );
}

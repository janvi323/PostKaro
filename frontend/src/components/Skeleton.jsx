export default function Skeleton({ className = '', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${className}`} />
      ))}
    </>
  );
}

export function PostSkeleton() {
  return (
    <div className="masonry-item">
      <div className="card overflow-hidden">
        <div className="skeleton w-full" style={{ height: `${Math.random() * 150 + 200}px` }} />
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="skeleton w-7 h-7 rounded-full" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card p-8 text-center space-y-4">
        <div className="skeleton w-28 h-28 rounded-full mx-auto" />
        <div className="skeleton h-6 w-40 mx-auto rounded" />
        <div className="skeleton h-4 w-24 mx-auto rounded" />
        <div className="flex justify-center gap-8">
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`skeleton h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
        </div>
      ))}
    </div>
  );
}

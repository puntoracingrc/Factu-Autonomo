export default function Loading() {
  return (
    <section
      className="mx-auto w-full max-w-7xl"
      aria-busy="true"
      aria-labelledby="route-loading-status"
    >
      <p id="route-loading-status" className="sr-only" role="status">
        Cargando sección…
      </p>
      <div className="space-y-6" aria-hidden="true">
        <div className="space-y-3">
          <div className="h-7 w-44 max-w-full rounded-md bg-slate-200 motion-safe:animate-pulse dark:bg-slate-700" />
          <div className="h-4 w-72 max-w-full rounded bg-slate-200 motion-safe:animate-pulse dark:bg-slate-700" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-3 border-t border-slate-200 py-5 dark:border-slate-700">
              <div className="h-4 w-24 rounded bg-slate-200 motion-safe:animate-pulse dark:bg-slate-700" />
              <div className="h-8 w-36 max-w-full rounded-md bg-slate-200 motion-safe:animate-pulse dark:bg-slate-700" />
              <div className="h-3 w-full rounded bg-slate-200 motion-safe:animate-pulse dark:bg-slate-700" />
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-12 w-full rounded-md bg-slate-200 motion-safe:animate-pulse dark:bg-slate-700"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

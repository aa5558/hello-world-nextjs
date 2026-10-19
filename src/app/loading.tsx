// Shown while a page's data loads.
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-8 sm:px-6 sm:pt-14">
      <div className="flex flex-col gap-4">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-16 w-full max-w-xl rounded-[24px]" />
        <div className="skeleton h-16 w-3/4 max-w-md rounded-[24px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="skeleton h-72 rounded-[28px]" />
        <div className="skeleton h-72 rounded-[28px]" />
      </div>
      <p className="text-center text-sm text-ink-3">loading the good stuff…</p>
    </main>
  );
}

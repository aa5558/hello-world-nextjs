// Shown while a screen's data loads: three quiet dots, nothing else.
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="flex min-h-[100svh] items-center justify-center">
      <span className="dots text-ink-3" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </main>
  );
}

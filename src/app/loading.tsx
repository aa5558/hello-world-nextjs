// Shown while a screen's data loads: three quiet dots, nothing else.
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="flex min-h-[100svh] items-center justify-center">
      <span className="dots text-pink" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </main>
  );
}

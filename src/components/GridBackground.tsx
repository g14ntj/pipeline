export function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-navy-deep">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-absolute-dark/80" />
      <div className="udl-grid-lines absolute inset-0 opacity-[0.05]" />
      <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-cerulean/10 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-cerulean/5 blur-3xl" />
    </div>
  );
}

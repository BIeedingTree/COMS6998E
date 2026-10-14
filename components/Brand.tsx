export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none">
        <path d="M7 6h10a4 4 0 0 1 4 4v7a3 3 0 0 1-3 3h-8l-5 4V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m21 2 1.2 3.3L25.5 6.5l-3.3 1.2L21 11l-1.2-3.3-3.3-1.2 3.3-1.2L21 2Z" fill="currentColor" />
        <path d="M9 12h6M9 16h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function Brand() {
  return <span className="brand"><BrandMark /><span>Say It <strong>Better</strong><span className="brand-dot">.</span></span></span>;
}

// src/components/sets/SetLogoPlaceholder.tsx  (WEB)
// Branded placeholder shown when a set has no logo/symbol image.
// Inline SVG — no dependencies.

export function SetLogoPlaceholder({
  width = 72,
  height = 60,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 120 100'
      fill='none'
      className={className}
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
    >
      <rect
        x='33'
        y='22'
        width='42'
        height='58'
        rx='7'
        transform='rotate(-10 54 51)'
        fill='#1A1C22'
        stroke='#4A4632'
        strokeWidth='2.5'
      />
      <rect
        x='46'
        y='20'
        width='42'
        height='58'
        rx='7'
        transform='rotate(9 67 49)'
        fill='#14161B'
        stroke='#C9A961'
        strokeWidth='2.5'
      />
      <path d='M67 36 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z' fill='#C9A961' />
    </svg>
  );
}

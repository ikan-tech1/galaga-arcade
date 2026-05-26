interface Props {
  scanlines: boolean;
  bloom: boolean;
}

/**
 * CSS-driven CRT overlay — repeating-linear-gradient scanlines, vignette,
 * subtle bloom, and a curved glass highlight. No per-frame work; the browser
 * composites it.
 */
export function CRTOverlay({ scanlines, bloom }: Props) {
  return (
    <>
      <div
        className="crt-canvas"
        style={{
          boxShadow:
            'inset 0 0 100px 30px rgba(0, 0, 0, 0.55), inset 0 0 30px 8px rgba(15, 0, 30, 0.6)',
          zIndex: 8,
        }}
      />
      {scanlines && (
        <div
          className="crt-canvas"
          style={{
            background:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.34) 0 1px, transparent 1px 3px)',
            zIndex: 9,
            mixBlendMode: 'multiply',
          }}
        />
      )}
      {scanlines && (
        <div
          className="crt-canvas"
          style={{
            background:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 2px)',
            zIndex: 9,
            mixBlendMode: 'multiply',
          }}
        />
      )}
      {bloom && (
        <div
          className="crt-canvas"
          style={{
            background:
              'radial-gradient(circle at 50% 60%, rgba(34,211,238,0.07), transparent 60%), radial-gradient(circle at 50% 40%, rgba(255,58,166,0.05), transparent 60%)',
            zIndex: 10,
            mixBlendMode: 'screen',
          }}
        />
      )}
      <div
        className="crt-canvas"
        style={{
          borderRadius: 14,
          boxShadow:
            'inset 0 0 6px rgba(255,255,255,0.06), inset 0 0 80px 20px rgba(0,0,0,0.55)',
          zIndex: 11,
        }}
      />
    </>
  );
}

type ArcoMarkProps = {
  className?: string;
  /** Accessible label; omit or pass empty string when decorative. */
  title?: string;
};

const MARK_OFFSET = "matrix(1,0,0,1,-138.004233,-2724.911895)";

/** Square-grid mark paths — embed inside a larger logo SVG or use via ArcoMark. */
export function ArcoMarkGraphic() {
  return (
    <g transform={MARK_OFFSET} fill="currentColor">
      <g transform="matrix(1,0,0,1,0,-1)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,15.004233,13.911895)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,15.004233,28.911895)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,30.004233,-1.088105)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,44.887621,-15.971492)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,44.887621,14.028508)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,59.887621,29.028508)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,15.004233,-16.088105)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,15.004233,-31.088105)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,60.004233,-31.088105)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,60.004233,-1.088105)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,-29.995767,-1.088105)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,-29.995767,-31.088105)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,-29.995767,28.911895)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,-14.995767,-16.088105)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
      <g transform="matrix(1,0,0,1,-15.112379,14.028508)">
        <rect x="168" y="2756" width="15" height="15" />
      </g>
    </g>
  );
}

/** Arco square-grid mark — standalone icon for boot splash, favicons, etc. */
export function ArcoMark({ className, title = "Arco" }: ArcoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 105 75"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <ArcoMarkGraphic />
    </svg>
  );
}

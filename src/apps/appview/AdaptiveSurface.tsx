/**
 * AdaptiveSurface — the per-container half of Arco's adaptivity model.
 *
 * The AndroidX-adaptive lesson (LEARNINGS §7): evaluate size class per
 * CONTAINER, not per viewport — a 380px window on a 5K display gets the
 * phone treatment. A ResizeObserver measures the surface and stamps a
 * `data-arco-size` class; adaptive.css then reflows generated layouts
 * (row Stacks → columns, chart heights, table scrolling) so every app
 * works at any size without the model doing anything special.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export type SizeClass = "compact" | "medium" | "expanded";

export function sizeClassFor(width: number): SizeClass {
  if (width < 560) return "compact";
  if (width < 920) return "medium";
  return "expanded";
}

interface Props {
  children: ReactNode;
  className?: string;
}

export function AdaptiveSurface({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<SizeClass>("expanded");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setSize(sizeClassFor(width));
    });
    observer.observe(el);
    setSize(sizeClassFor(el.clientWidth));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`arco-adaptive ${className ?? ""}`}
      data-arco-size={size}
    >
      {children}
    </div>
  );
}

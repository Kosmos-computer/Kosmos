import { useEffect, useState } from "react";
import type { NotesGraphEdge, NotesGraphNode } from "./types";

interface LayoutNode extends NotesGraphNode {
  vx: number;
  vy: number;
}

/** Simple force-directed layout — no external graph library required. */
export function useForceLayout(
  nodes: NotesGraphNode[],
  edges: NotesGraphEdge[],
  activeId?: string,
): NotesGraphNode[] {
  const [layout, setLayout] = useState(nodes);

  useEffect(() => {
    if (nodes.length === 0) {
      setLayout([]);
      return;
    }

    const simNodes: LayoutNode[] = nodes.map((node) => ({
      ...node,
      vx: 0,
      vy: 0,
    }));

    const iterations = 120;
    const centerPull = 0.02;
    const repulsion = 420;
    const attraction = 0.045;
    const damping = 0.82;

    for (let step = 0; step < iterations; step += 1) {
      for (const node of simNodes) {
        node.vx += (50 - node.x) * centerPull;
        node.vy += (50 - node.y) * centerPull;
      }

      for (let i = 0; i < simNodes.length; i += 1) {
        for (let j = i + 1; j < simNodes.length; j += 1) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.max(Math.hypot(dx, dy), 0.1);
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      for (const edge of edges) {
        const from = simNodes.find((node) => node.id === edge.from);
        const to = simNodes.find((node) => node.id === edge.to);
        if (!from || !to) continue;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.max(Math.hypot(dx, dy), 0.1);
        const force = (dist - 18) * attraction;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        from.vx += fx;
        from.vy += fy;
        to.vx -= fx;
        to.vy -= fy;
      }

      for (const node of simNodes) {
        node.vx *= damping;
        node.vy *= damping;
        node.x = Math.min(92, Math.max(8, node.x + node.vx * 0.08));
        node.y = Math.min(92, Math.max(8, node.y + node.vy * 0.08));
      }
    }

    if (activeId) {
      const active = simNodes.find((node) => node.id === activeId);
      if (active) {
        for (const node of simNodes) {
          if (node.id === activeId) continue;
          const linked = edges.some(
            (edge) =>
              (edge.from === activeId && edge.to === node.id) ||
              (edge.to === activeId && edge.from === node.id),
          );
          if (linked) {
            node.x += (active.x - node.x) * 0.12;
            node.y += (active.y - node.y) * 0.12;
          }
        }
      }
    }

    setLayout(simNodes.map(({ vx: _vx, vy: _vy, ...node }) => node));
  }, [nodes, edges, activeId]);

  return layout;
}

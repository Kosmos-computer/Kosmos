/**
 * Memory — operator workspace for typed memory, vector stores, RAG, and identity docs.
 * Phase 0: stub hook + mock data. See docs/memory-plan.md.
 */
import { SidebarPane } from "../../components/patterns";
import { MemorySidebar } from "./MemorySidebar";
import { useMemoryStub } from "./useMemoryStub";
import { MemoryBrowserView } from "./views/MemoryBrowserView";
import { MemoryDashboardView } from "./views/MemoryDashboardView";
import {
  MemoryGraphView,
  MemoryIdentityView,
  MemoryPlaceholderView,
  MemoryRagView,
  MemoryVectorView,
} from "./views/MemoryStoreViews";
import { MemoryWorldModelView } from "./views/MemoryWorldModelView";

export function MemoryApp() {
  const memory = useMemoryStub();

  function renderMain() {
    switch (memory.view) {
      case "dashboard":
        return <MemoryDashboardView metrics={memory.data.overviewMetrics} />;
      case "memory":
        return <MemoryBrowserView entries={memory.data.memoryEntries} />;
      case "knowledge-graph":
        return (
          <MemoryGraphView nodes={memory.data.graphNodes} edges={memory.data.graphEdges} />
        );
      case "rag":
        return (
          <MemoryRagView queries={memory.data.ragQueries} chunks={memory.data.ragChunks} />
        );
      case "vector-db":
        return <MemoryVectorView collections={memory.data.collections} />;
      case "world-model":
        return (
          <MemoryWorldModelView
            worldview={memory.data.worldviewDocument}
            integralMap={memory.data.integralMapDocument}
            ethics={memory.data.ethicsDocument}
            principles={memory.data.ethicalPrinciples}
            nodes={memory.data.worldModelNodes}
            edges={memory.data.worldModelEdges}
          />
        );
      case "worldview-md":
        return <MemoryIdentityView document={memory.data.worldviewDocument} />;
      case "integral-map-md":
        return <MemoryIdentityView document={memory.data.integralMapDocument} />;
      case "soul-md":
        return <MemoryIdentityView document={memory.data.soulDocument} />;
      case "ethics-md":
        return <MemoryIdentityView document={memory.data.ethicsDocument} />;
      case "user-md":
        return <MemoryIdentityView document={memory.data.userDocument} />;
      case "settings":
        return (
          <MemoryPlaceholderView
            title="Memory settings"
            description="Backend, embedder, and retention controls live in Settings → Memory until this view is wired."
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="arco-memory">
      <SidebarPane width={memory.sidebarWidth} onWidthChange={memory.setSidebarWidth}>
        <MemorySidebar data={memory.data} view={memory.view} onViewChange={memory.setView} />
      </SidebarPane>
      <main className="arco-memory__main">{renderMain()}</main>
    </div>
  );
}

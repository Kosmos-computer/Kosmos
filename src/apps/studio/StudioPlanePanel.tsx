/**
 * Plane issues inside Techno Studio.
 *
 * Each row opens the one Studio session bound to that issue. Cloning the
 * engine repo is a separate button: a list click must not start a fetch
 * of the repository.
 */
import { useCallback, useEffect, useState } from "react";
import { FolderGit2, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

interface PlaneIssueRow {
  id: string;
  key: string;
  name: string;
  sequenceId: number;
  sessionId: string | null;
}

export function StudioPlanePanel({ onOpenSession }: { onOpenSession: (sessionId: string) => void }) {
  const [issues, setIssues] = useState<PlaneIssueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setIssues(await api.listPlaneIssues());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Plane issues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openIssue = useCallback(
    async (issueId: string) => {
      setBusyId(issueId);
      setError(null);
      try {
        const session = await api.openPlaneSession(issueId);
        onOpenSession(session.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open the Studio session");
      } finally {
        setBusyId(null);
      }
    },
    [onOpenSession],
  );

  const cloneEngine = useCallback(async () => {
    setCloning(true);
    setError(null);
    try {
      await api.cloneEngineRepo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clone the engine repo");
    } finally {
      setCloning(false);
    }
  }, []);

  return (
    <div className="arco-plane">
      <header className="arco-plane__head">
        <div>
          <h1 className="arco-plane__title">Plane</h1>
          <p className="arco-plane__sub">
            This cycle on the Engine board. One Studio chat per issue. Canvas keeps its own log.
          </p>
        </div>
        <button type="button" className="arco-plane__clone" onClick={() => void cloneEngine()} disabled={cloning}>
          {cloning ? <Loader2 size={14} className="arco-spin" /> : <FolderGit2 size={14} />}
          Open kosmos-engine
        </button>
      </header>
      {error ? <p className="arco-plane__error">{error}</p> : null}
      {loading ? (
        <p className="arco-plane__sub">Loading issues…</p>
      ) : (
        <ul className="arco-plane__list">
          {issues.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                className="arco-plane__row"
                onClick={() => void openIssue(issue.id)}
                disabled={busyId === issue.id}
              >
                <span className="arco-plane__key">{issue.key}</span>
                <span className="arco-plane__name">{issue.name}</span>
                {issue.sessionId ? <span className="arco-plane__badge">Chat</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

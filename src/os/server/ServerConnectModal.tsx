/**
 * First-run and server-switch modal for bundled mobile shells.
 * User must enter a server URL — no default cloud host is baked in.
 */
import { useCallback, useState } from "react";
import { Loader2, Radar, Server } from "lucide-react";
import { ArcoLogo } from "../../components/ArcoLogo";
import { Button, Input } from "../../components/ui";
import { AuthWallpaperBackdrop } from "../wallpaper/AuthWallpaperBackdrop";
import type { DiscoveredServer } from "./serverProfileTypes";
import {
  discoverNearbyServers,
  normalizeServerUrl,
  reloadForServerSwitch,
  testServerConnection,
  upsertServerProfile,
} from "./serverProfileStore";

interface ServerConnectModalProps {
  onConnected?: () => void;
}

export function ServerConnectModal({ onConnected }: ServerConnectModalProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredServer[]>([]);

  const connect = useCallback(
    async (rawUrl: string, profileName?: string, kind: "cloud" | "home" | "local-linux" | "custom" = "custom") => {
      setConnecting(true);
      setError(null);
      try {
        const origin = normalizeServerUrl(rawUrl);
        const test = await testServerConnection(origin);
        if (!test.ok) {
          setError(test.error);
          return;
        }
        upsertServerProfile({
          name: profileName?.trim() || origin,
          url: origin,
          kind,
        });
        onConnected?.();
        reloadForServerSwitch();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setConnecting(false);
      }
    },
    [onConnected],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void connect(url, name || undefined);
  };

  const handleScan = async () => {
    setScanning(true);
    setScanStatus(null);
    setDiscovered([]);
    setError(null);
    try {
      const hits = await discoverNearbyServers((msg) => setScanStatus(msg));
      setDiscovered(hits);
      if (hits.length === 0) {
        setScanStatus("No servers found on this network. Enter a URL manually — e.g. Tailscale hostname or Coolify domain.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="arco-authscreen arco-server-connect">
      <AuthWallpaperBackdrop />
      <div className="arco-authscreen__stack">
        <div className="arco-authscreen__branding">
          <ArcoLogo className="arco-authscreen__logo" />
        </div>
        <div className="arco-authscreen__card arco-server-connect__card">
          <div className="arco-server-connect__header">
            <Server size={22} aria-hidden />
            <div>
              <h1>Connect to Kosmos</h1>
              <p>Enter your server address. Each server has its own account and data.</p>
            </div>
          </div>

          <form className="arco-server-connect__form" onSubmit={handleSubmit}>
            <label className="arco-server-connect__field">
              <span>Server URL</span>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-server.example or http://10.0.0.12:4600"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="url"
                required
              />
            </label>
            <label className="arco-server-connect__field">
              <span>Label (optional)</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Home Mac, Cloud, Chromebook Linux…"
              />
            </label>
            {error && <p className="arco-server-connect__error">{error}</p>}
            <Button type="submit" disabled={connecting || !url.trim()} className="arco-server-connect__primary">
              {connecting ? <Loader2 size={16} className="arco-spin" /> : null}
              Test &amp; connect
            </Button>
          </form>

          <div className="arco-server-connect__scan">
            <Button type="button" variant="default" onClick={() => void handleScan()} disabled={scanning}>
              {scanning ? <Loader2 size={16} className="arco-spin" /> : <Radar size={16} />}
              Find on this network
            </Button>
            {scanStatus && <p className="arco-server-connect__hint">{scanStatus}</p>}
          </div>

          {discovered.length > 0 && (
            <ul className="arco-server-connect__list">
              {discovered.map((hit) => (
                <li key={hit.url}>
                  <button
                    type="button"
                    className="arco-server-connect__hit"
                    onClick={() =>
                      void connect(
                        hit.url,
                        hit.label,
                        hit.source === "linux-bridge" ? "local-linux" : hit.source === "scan" ? "home" : "custom",
                      )
                    }
                    disabled={connecting}
                  >
                    <strong>{hit.label}</strong>
                    <span>{hit.url}</span>
                    <span>{hit.needsSetup ? "Setup required" : "Ready"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="arco-server-connect__footnote">
            Examples: Coolify host, Tailscale URL (<code>https://macbook.tailnet.ts.net:4600</code>), or LAN IP on
            the same Wi‑Fi (<code>http://10.0.0.12:4600</code>). After connecting, sign in or complete setup on that
            server. On Chromebook, run Kosmos in Linux first, then scan for the local backend.
          </p>
        </div>
      </div>
    </div>
  );
}

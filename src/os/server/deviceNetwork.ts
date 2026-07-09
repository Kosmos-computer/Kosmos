/**
 * Best-effort Wi‑Fi subnet detection for bundled mobile shells.
 * Uses WebRTC ICE candidates (no native plugin or extra permissions).
 */

/** True when running as the Android app on Chrome OS (Crostini bridge applies). */
export function isChromeOsDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /CrOS/.test(navigator.userAgent);
}

function subnetFromIp(ip: string): string | null {
  const parts = ip.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d+$/.test(p))) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (a === 10) return parts.slice(0, 3).join(".");
  if (a === 172 && b >= 16 && b <= 31) return parts.slice(0, 3).join(".");
  if (a === 192 && b === 168) return parts.slice(0, 3).join(".");
  return null;
}

/** Resolve the device's current /24 subnet, e.g. `10.0.0`, when on Wi‑Fi/LAN. */
export async function detectDeviceWifiSubnet(timeoutMs = 2500): Promise<string | null> {
  if (typeof window === "undefined" || typeof RTCPeerConnection !== "function") return null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (subnet: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        pc.close();
      } catch {
        // ignore
      }
      resolve(subnet);
    };

    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("arco-subnet-probe");
    pc.onicecandidate = (event) => {
      const candidate = event.candidate?.candidate;
      if (!candidate) return;
      const match = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(candidate);
      if (!match) return;
      const subnet = subnetFromIp(match[1]);
      if (subnet) finish(subnet);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => finish(null));
  });
}

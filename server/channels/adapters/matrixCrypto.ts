/**
 * Minimal Matrix cross-signing bootstrap (subset of OpenClaw crypto-bootstrap).
 * Full SAS/QR verification UI remains out of scope; this publishes device signing keys.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function bootstrapMatrixCrossSigning(client: any): Promise<{
  crossSigningReady: boolean;
  ownDeviceVerified: boolean | null;
}> {
  const crypto = client?.getCrypto?.();
  if (!crypto?.bootstrapCrossSigning) {
    return { crossSigningReady: false, ownDeviceVerified: null };
  }

  const authUploadDeviceSigningKeys = async <T>(
    makeRequest: (authData: Record<string, unknown> | null) => Promise<T>,
  ): Promise<T> => {
    try {
      return await makeRequest(null);
    } catch {
      try {
        return await makeRequest({ type: "m.login.dummy" });
      } catch {
        return await makeRequest(null);
      }
    }
  };

  try {
    await crypto.bootstrapCrossSigning({
      authUploadDeviceSigningKeys,
      setupNewCrossSigning: true,
    });
  } catch (err) {
    // Already bootstrapped / UIA required — non-fatal for message send/receive.
    console.warn(
      "[matrix] cross-signing bootstrap:",
      err instanceof Error ? err.message : err,
    );
  }

  let crossSigningReady = false;
  let ownDeviceVerified: boolean | null = null;
  try {
    crossSigningReady = Boolean(await crypto.isCrossSigningReady?.());
  } catch {
    /* ignore */
  }
  try {
    const userId = client.getUserId?.();
    const deviceId = client.getDeviceId?.();
    if (userId && deviceId && crypto.getDeviceVerificationStatus) {
      const status = await crypto.getDeviceVerificationStatus(userId, deviceId);
      ownDeviceVerified = status?.isVerified?.() ?? status?.crossSigningVerified ?? null;
    }
  } catch {
    /* ignore */
  }
  return { crossSigningReady, ownDeviceVerified };
}

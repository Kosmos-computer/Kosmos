import { DownloadsWorkspace } from "./DownloadsWorkspace";
import { useDownloadsStub } from "./useDownloadsStub";

export function DownloadsApp() {
  const vm = useDownloadsStub();

  return <DownloadsWorkspace vm={vm} />;
}

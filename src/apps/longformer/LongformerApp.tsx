import { LongformerWorkspace } from "./LongformerWorkspace";
import { useLongformerStub } from "./useLongformerStub";

export function LongformerApp() {
  const vm = useLongformerStub();
  return <LongformerWorkspace vm={vm} />;
}

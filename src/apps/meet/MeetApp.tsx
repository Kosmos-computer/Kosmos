import { MeetControlBar, MeetHeader, MeetSidebar, MeetVideoGrid } from "./MeetParts";
import { useMeetStub } from "./useMeetStub";

export function MeetApp() {
  const vm = useMeetStub();

  return (
    <div className="arco-meet">
      <MeetHeader vm={vm} />
      <div className="arco-meet__main">
        <div className="arco-meet__stage">
          <MeetVideoGrid vm={vm} />
          <MeetControlBar vm={vm} />
        </div>
        <MeetSidebar vm={vm} />
      </div>
    </div>
  );
}

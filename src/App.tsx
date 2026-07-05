/** Root — pick desktop or mobile shell by viewport (the chrome profile). */
import { useEffect, useState } from "react";
import { Desktop } from "./os/Desktop";
import { MobileShell } from "./os/MobileShell";

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

export default function App() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileShell /> : <Desktop />;
}

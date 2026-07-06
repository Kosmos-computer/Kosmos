import { LogoMark } from "../components/LogoMark";
import { useOsStore } from "./osStore";

/** Nav rail brand slot — default Kosmos mark on white, or a user-provided image. */
export function NavBrandMark({ className = "" }: { className?: string }) {
  const navBrandImage = useOsStore((s) => s.navBrandImage);
  const classes = ["arco-navrail__brand", className].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-hidden="true">
      {navBrandImage ? (
        <img className="arco-navrail__brand-image" src={navBrandImage} alt="" />
      ) : (
        <LogoMark className="arco-navrail__brand-mark" title="" />
      )}
    </span>
  );
}

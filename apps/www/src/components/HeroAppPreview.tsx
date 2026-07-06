import { StarfieldWallpaper } from "@arco/wallpaper/StarfieldWallpaper";
import "@arco/wallpaper/wallpaper.css";
import styles from "./HeroAppPreview.module.css";

export function HeroAppPreview() {
  return (
    <div className={styles.frame} aria-label="Kosmos app preview">
      <div className={`${styles.backdrop} arco-wallpaper arco-wallpaper-starfield`}>
        <StarfieldWallpaper theme="dark" />
        <div className="arco-wallpaper__veil" />
      </div>
      <div className={styles.shotWrap}>
        <img
          className={styles.shot}
          src="/kosmos-desktop.png"
          alt="Kosmos desktop with starfield wallpaper"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
}

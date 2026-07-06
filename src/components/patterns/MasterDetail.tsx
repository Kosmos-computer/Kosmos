import type { ReactNode } from "react";

export interface MasterDetailProps {
  list: ReactNode;
  detail: ReactNode;
  listOpen?: boolean;
  className?: string;
}

/** List-detail layout — sidebar list with a main content pane. */
export function MasterDetail({ list, detail, listOpen = true, className = "" }: MasterDetailProps) {
  const classes = ["arco-master-detail", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {listOpen ? <aside className="arco-master-detail__list arco-scroll">{list}</aside> : null}
      <div className="arco-master-detail__main">{detail}</div>
    </div>
  );
}

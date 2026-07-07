import { Button } from "../../components/ui";

interface LongformerPlaceholderViewProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function LongformerPlaceholderView({
  title,
  description,
  actionLabel,
  onAction,
}: LongformerPlaceholderViewProps) {
  return (
    <div className="arco-longformer-placeholder">
      <h1 className="arco-longformer-placeholder__title">{title}</h1>
      <p className="arco-longformer-placeholder__text">{description}</p>
      {actionLabel && onAction ? (
        <Button type="button" variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

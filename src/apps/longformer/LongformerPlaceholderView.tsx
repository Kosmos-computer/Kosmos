import { Button } from "../../components/ui";

interface LongformerPlaceholderViewProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function LongformerPlaceholderView({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: LongformerPlaceholderViewProps) {
  const hasActions = Boolean((actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction));

  return (
    <div className="arco-longformer-placeholder">
      <h1 className="arco-longformer-placeholder__title">{title}</h1>
      <p className="arco-longformer-placeholder__text">{description}</p>
      {hasActions ? (
        <div className="arco-longformer-placeholder__actions">
          {actionLabel && onAction ? (
            <Button type="button" variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button type="button" variant="default" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

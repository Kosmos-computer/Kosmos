export interface SearchAttributionProps {
  className?: string;
}

export function SearchAttribution({ className = "" }: SearchAttributionProps) {
  return (
    <p className={`arco-search-attribution${className ? ` ${className}` : ""}`}>
      Powered by{" "}
      <a href="https://duckduckgo.com/" target="_blank" rel="noopener noreferrer">
        DuckDuckGo
      </a>
    </p>
  );
}

/**
 * Token-native react-markdown element mapping for Arco prose surfaces.
 */
import type { Components } from "react-markdown";

export const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="arco-richmd__h1">{children}</h1>,
  h2: ({ children }) => <h2 className="arco-richmd__h2">{children}</h2>,
  h3: ({ children }) => <h3 className="arco-richmd__h3">{children}</h3>,
  p: ({ children }) => <p className="arco-richmd__p">{children}</p>,
  ul: ({ children }) => <ul className="arco-richmd__ul">{children}</ul>,
  ol: ({ children }) => <ol className="arco-richmd__ol">{children}</ol>,
  li: ({ children }) => <li className="arco-richmd__li">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="arco-richmd__blockquote">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a className="arco-richmd__link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="arco-richmd__hr" />,
  table: ({ children }) => (
    <div className="arco-richmd__table-wrap">
      <table className="arco-richmd__table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={`arco-richmd__code ${className ?? ""}`}>{children}</code>;
    }
    return <code className="arco-richmd__code-inline">{children}</code>;
  },
  pre: ({ children }) => <pre className="arco-richmd__pre">{children}</pre>,
  input: ({ checked, disabled, type }) => {
    if (type === "checkbox") {
      return (
        <input
          className="arco-richmd__checkbox"
          type="checkbox"
          checked={checked}
          disabled={disabled}
          readOnly
        />
      );
    }
    return <input type={type} checked={checked} disabled={disabled} readOnly />;
  },
};

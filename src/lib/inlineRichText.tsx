import { Fragment } from 'react';

/** Render the small shared rich-text vocabulary used by learner-facing content. */
export function renderInlineRichText(text: string): React.ReactNode {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, index) => {
    const key = `${token}-${index}`;
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return <Fragment key={key}>{token}</Fragment>;
  });
}

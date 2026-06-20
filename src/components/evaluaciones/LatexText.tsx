import { useMemo } from 'react';
import katex from 'katex';
import { cn } from '@/lib/utils';

interface LatexTextProps {
  children: string | null | undefined;
  className?: string;
}

type TextPart = {
  type: 'text';
  value: string;
};

type MathPart = {
  type: 'math';
  value: string;
  displayMode: boolean;
  raw: string;
};

type Part = TextPart | MathPart;

const delimiters = [
  { open: '$$', close: '$$', displayMode: true },
  { open: '\\[', close: '\\]', displayMode: true },
  { open: '\\(', close: '\\)', displayMode: false },
  { open: '$', close: '$', displayMode: false },
];

const findNextDelimiter = (text: string, from: number) => {
  let best: { index: number; delimiter: (typeof delimiters)[number] } | null = null;

  for (const delimiter of delimiters) {
    const index = text.indexOf(delimiter.open, from);
    if (index !== -1 && (!best || index < best.index)) {
      best = { index, delimiter };
    }
  }

  return best;
};

const parseLatexText = (text: string): Part[] => {
  const parts: Part[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const next = findNextDelimiter(text, cursor);

    if (!next) {
      parts.push({ type: 'text', value: text.slice(cursor) });
      break;
    }

    if (next.index > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, next.index) });
    }

    const contentStart = next.index + next.delimiter.open.length;
    const contentEnd = text.indexOf(next.delimiter.close, contentStart);

    if (contentEnd === -1) {
      parts.push({ type: 'text', value: text.slice(next.index) });
      break;
    }

    const value = text.slice(contentStart, contentEnd).trim();
    const raw = text.slice(next.index, contentEnd + next.delimiter.close.length);

    if (value) {
      parts.push({
        type: 'math',
        value,
        displayMode: next.delimiter.displayMode,
        raw,
      });
    } else {
      parts.push({ type: 'text', value: raw });
    }

    cursor = contentEnd + next.delimiter.close.length;
  }

  return parts;
};

const renderText = (value: string, keyPrefix: string) =>
  value.split('\n').map((line, index, lines) => (
    <span key={`${keyPrefix}-${index}`}>
      {line}
      {index < lines.length - 1 && <br />}
    </span>
  ));

const renderMath = (part: MathPart) => {
  try {
    return katex.renderToString(part.value, {
      displayMode: part.displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return null;
  }
};

export function LatexText({ children, className }: LatexTextProps) {
  const text = children || '';
  const parts = useMemo(() => parseLatexText(text), [text]);

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return renderText(part.value, `text-${index}`);
        }

        const html = renderMath(part);

        if (!html) {
          return (
            <code key={index} className="rounded bg-destructive/10 px-1 text-destructive">
              {part.raw}
            </code>
          );
        }

        return (
          <span
            key={index}
            className={part.displayMode ? 'my-3 block overflow-x-auto py-1' : 'inline-block max-w-full overflow-x-auto align-middle'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}

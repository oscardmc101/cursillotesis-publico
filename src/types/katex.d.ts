declare module 'katex' {
  interface KatexOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    errorColor?: string;
    macros?: Record<string, string>;
    colorIsTextColor?: boolean;
    maxSize?: number;
    maxExpand?: number;
    allowedProtocols?: string[];
    strict?: boolean | string | ((errorCode: string, errorMsg: string, token: unknown) => boolean | string);
    trust?: boolean | ((context: unknown) => boolean);
  }

  const katex: {
    renderToString: (expression: string, options?: KatexOptions) => string;
  };

  export default katex;
}

const originalWarn = console.warn.bind(console);

console.warn = (...args: unknown[]) => {
  const firstArg = args[0];
  if (
    typeof firstArg === 'string' &&
    firstArg.includes('Lit is in dev mode. Not recommended for production!')
  ) {
    return;
  }

  originalWarn(...args);
};

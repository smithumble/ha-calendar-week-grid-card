// declaration.d.ts
declare module '*.css';
declare module '*.svg';
declare module '*.yaml' {
  const content: Partial<import('../types').CardConfig>;
  export default content;
}
declare module '*.yml' {
  const content: Partial<import('../types').CardConfig>;
  export default content;
}

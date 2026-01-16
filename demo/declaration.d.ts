declare module '*.json' {
  const content: any;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.yaml' {
  const content: string;
  export default content;
}

declare module '*.yml' {
  const content: string;
  export default content;
}

declare module 'virtual:asset-manifest' {
  export const ASSET_MANIFEST: string[];
}

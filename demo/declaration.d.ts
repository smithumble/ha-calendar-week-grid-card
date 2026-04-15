declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: string;
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

declare module 'virtual:asset-manifest/demo' {
  export const ASSET_MANIFEST: string[];
}

declare module 'virtual:asset-manifest/schedule' {
  export const ASSET_MANIFEST: string[];
}

declare module 'virtual:asset-manifest/screenshot' {
  export const ASSET_MANIFEST: string[];
}

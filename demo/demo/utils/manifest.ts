let manifest: readonly string[] = [];

export function setAssetManifest(next: readonly string[]): void {
  manifest = next;
}

export function getAssetManifest(): readonly string[] {
  return manifest;
}

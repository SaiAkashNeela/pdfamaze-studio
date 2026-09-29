/**
 * Passes result files to the next tool when someone picks "Continue with…". The files only
 * live in this tab's memory for the length of one navigation; nothing is stored or uploaded.
 */
let pending: File[] | null = null;

export function handOff(files: File[]): void {
  pending = files;
}

/** Takes (and clears) handed-off files that the receiving tool accepts. */
export function takeHandoff(accepts: (file: File) => boolean): File[] {
  const files = pending ?? [];
  pending = null;
  return files.filter(accepts);
}

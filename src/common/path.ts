export function basename(path: string) {
  if (path && path.length) {
    let parts = path.split(/[\\\/]/g);

    return parts[parts.length - 1];
  }

  return '';
}

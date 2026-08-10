import {
  getVirtualNode,
  OPS001_WORKSPACE_ROOT,
  type VirtualDirectoryPath,
  type VirtualNode
} from './virtualFilesystem';

export type PathResolution =
  | Readonly<{ kind: 'found'; node: VirtualNode }>
  | Readonly<{ kind: 'missing'; input: string; canonicalPath: string }>
  | Readonly<{ kind: 'outside-workspace'; input: string }>;

const rootSegments = ['home', 'recruit'] as const;

export function resolveVirtualPath(
  currentDirectory: VirtualDirectoryPath,
  rawPath: string
): PathResolution {
  const input = rawPath.trim();
  const absolute = input.startsWith('/');

  if (
    absolute &&
    input !== OPS001_WORKSPACE_ROOT &&
    !input.startsWith(`${OPS001_WORKSPACE_ROOT}/`)
  ) {
    return { kind: 'outside-workspace', input };
  }

  const segments = absolute
    ? [...rootSegments]
    : currentDirectory === OPS001_WORKSPACE_ROOT
      ? [...rootSegments]
      : [...rootSegments, 'training'];
  const suppliedSegments = absolute
    ? input.slice(OPS001_WORKSPACE_ROOT.length).split('/')
    : input.split('/');

  for (const segment of suppliedSegments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === rootSegments.length) {
        if (suppliedSegments.length === 1) continue;
        return { kind: 'outside-workspace', input };
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  const canonicalPath = `/${segments.join('/')}`;
  const node = getVirtualNode(canonicalPath);
  return node === null ? { kind: 'missing', input, canonicalPath } : { kind: 'found', node };
}

export function getTerminalPrompt(path: VirtualDirectoryPath): string {
  return path === OPS001_WORKSPACE_ROOT
    ? 'recruit@opslyce-hq:~$'
    : 'recruit@opslyce-hq:~/training$';
}

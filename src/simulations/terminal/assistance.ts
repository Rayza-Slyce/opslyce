import {
  getVirtualNode,
  OPS001_WORKSPACE_ROOT,
  type VirtualDirectoryPath,
  type VirtualPath
} from './virtualFilesystem';

export function getShortestTerminalTarget(
  currentDirectory: VirtualDirectoryPath,
  canonicalPath: VirtualPath,
  folderSlash = false
): string {
  const node = getVirtualNode(canonicalPath);
  if (node === null) throw new Error(`Unknown authored Terminal path: ${canonicalPath}`);
  let target: string;

  if (canonicalPath === currentDirectory) target = '.';
  else if (currentDirectory === OPS001_WORKSPACE_ROOT) {
    target = canonicalPath.startsWith('/home/recruit/training/')
      ? canonicalPath.slice('/home/recruit/'.length)
      : canonicalPath.slice('/home/recruit/'.length);
  } else if (canonicalPath === OPS001_WORKSPACE_ROOT) target = '..';
  else if (canonicalPath.startsWith('/home/recruit/training/')) {
    target = canonicalPath.slice('/home/recruit/training/'.length);
  } else target = `../${canonicalPath.slice('/home/recruit/'.length)}`;

  return folderSlash && node.kind === 'folder' && target !== '.' && target !== '..'
    ? `${target}/`
    : target;
}

export function prepareTerminalObjectCommand(
  action: 'read-file' | 'enter-folder' | 'list-contents',
  currentDirectory: VirtualDirectoryPath,
  canonicalPath: VirtualPath
): string {
  const target = getShortestTerminalTarget(currentDirectory, canonicalPath);
  return action === 'read-file'
    ? `cat ${target}`
    : action === 'enter-folder'
      ? `cd ${target}`
      : `ls ${target}`;
}

export const OPS001_WORKSPACE_ROOT = '/home/recruit' as const;

export type VirtualDirectoryPath = '/home/recruit' | '/home/recruit/training';
export type VirtualFilePath =
  | '/home/recruit/welcome.txt'
  | '/home/recruit/training/equipment.txt'
  | '/home/recruit/training/trace-note.txt';
export type VirtualPath = VirtualDirectoryPath | VirtualFilePath;

export type VirtualFile = Readonly<{
  kind: 'file';
  name: string;
  path: VirtualFilePath;
  content: string;
}>;

export type VirtualDirectory = Readonly<{
  kind: 'folder';
  name: string;
  path: VirtualDirectoryPath;
  children: readonly VirtualPath[];
}>;

export type VirtualNode = VirtualFile | VirtualDirectory;

const welcomeContent = `WELCOME TO OPSLYCE HQ

Recruit Workspace status: READY

Agent Trace left your first training message here:

training/trace-note.txt

Use the Field Terminal to locate and read it.`;

const equipmentContent = `RECRUIT FIELD EQUIPMENT

FIELD TERMINAL
Inspect files and folders in the Recruit Workspace.

EVIDENCE LOCKER
Stores useful discoveries during an operation.

FIELD BROWSER
Opens authorised HQ pages and recovered routes.

Additional equipment is issued as your rank increases.`;

const traceNoteContent = `RECRUIT,

Good investigators begin by checking what is already available.

Your verification flag is stored in the HQ Training Portal.

HQ Training route:
/recruit-verification

Recover the flag and submit it to Mission Control.

— Agent Trace`;

export const OPS001_VIRTUAL_FILESYSTEM = Object.freeze({
  root: Object.freeze({
    kind: 'folder',
    name: 'recruit',
    path: '/home/recruit',
    children: ['/home/recruit/welcome.txt', '/home/recruit/training'] as const
  }),
  training: Object.freeze({
    kind: 'folder',
    name: 'training',
    path: '/home/recruit/training',
    children: [
      '/home/recruit/training/equipment.txt',
      '/home/recruit/training/trace-note.txt'
    ] as const
  }),
  welcome: Object.freeze({
    kind: 'file',
    name: 'welcome.txt',
    path: '/home/recruit/welcome.txt',
    content: welcomeContent
  }),
  equipment: Object.freeze({
    kind: 'file',
    name: 'equipment.txt',
    path: '/home/recruit/training/equipment.txt',
    content: equipmentContent
  }),
  traceNote: Object.freeze({
    kind: 'file',
    name: 'trace-note.txt',
    path: '/home/recruit/training/trace-note.txt',
    content: traceNoteContent
  })
} satisfies Record<string, VirtualNode>);

const nodesByPath = new Map<VirtualPath, VirtualNode>(
  Object.values(OPS001_VIRTUAL_FILESYSTEM).map((node) => [node.path, node])
);

export function getVirtualNode(path: string): VirtualNode | null {
  return nodesByPath.get(path as VirtualPath) ?? null;
}

export function getVirtualFile(path: VirtualFilePath): VirtualFile {
  const node = nodesByPath.get(path);
  if (node?.kind !== 'file') throw new Error(`Authored virtual file is missing: ${path}`);
  return node;
}

export function listVirtualDirectory(directory: VirtualDirectory): readonly VirtualNode[] {
  return directory.children.map((path) => {
    const node = nodesByPath.get(path);
    if (node === undefined) throw new Error(`Authored virtual object is missing: ${path}`);
    return node;
  });
}

export function isVirtualDirectoryPath(path: string): path is VirtualDirectoryPath {
  return getVirtualNode(path)?.kind === 'folder';
}

export function isVirtualFilePath(path: string): path is VirtualFilePath {
  return getVirtualNode(path)?.kind === 'file';
}

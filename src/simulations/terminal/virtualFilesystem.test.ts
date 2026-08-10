import {
  getVirtualFile,
  getVirtualNode,
  listVirtualDirectory,
  OPS001_VIRTUAL_FILESYSTEM
} from './virtualFilesystem';

describe('OPS-001 virtual filesystem', () => {
  it('contains exactly the authored tree', () => {
    expect(
      Object.values(OPS001_VIRTUAL_FILESYSTEM).map(({ kind, path }) => ({ kind, path }))
    ).toEqual([
      { kind: 'folder', path: '/home/recruit' },
      { kind: 'folder', path: '/home/recruit/training' },
      { kind: 'file', path: '/home/recruit/welcome.txt' },
      { kind: 'file', path: '/home/recruit/training/equipment.txt' },
      { kind: 'file', path: '/home/recruit/training/trace-note.txt' }
    ]);
    expect(
      listVirtualDirectory(OPS001_VIRTUAL_FILESYSTEM.root).map(({ name, kind }) => ({ name, kind }))
    ).toEqual([
      { name: 'welcome.txt', kind: 'file' },
      { name: 'training', kind: 'folder' }
    ]);
    expect(
      listVirtualDirectory(OPS001_VIRTUAL_FILESYSTEM.training).map(({ name, kind }) => ({
        name,
        kind
      }))
    ).toEqual([
      { name: 'equipment.txt', kind: 'file' },
      { name: 'trace-note.txt', kind: 'file' }
    ]);
  });

  it('preserves the exact authored file contents and blank lines', () => {
    expect(getVirtualFile('/home/recruit/welcome.txt').content).toBe(`WELCOME TO OPSLYCE HQ

Recruit Workspace status: READY

Agent Trace left your first training message here:

training/trace-note.txt

Use the Field Terminal to locate and read it.`);
    expect(getVirtualFile('/home/recruit/training/equipment.txt').content)
      .toBe(`RECRUIT FIELD EQUIPMENT

FIELD TERMINAL
Inspect files and folders in the Recruit Workspace.

EVIDENCE LOCKER
Stores useful discoveries during an operation.

FIELD BROWSER
Opens authorised HQ pages and recovered routes.

Additional equipment is issued as your rank increases.`);
    expect(getVirtualFile('/home/recruit/training/trace-note.txt').content).toBe(`RECRUIT,

Good investigators begin by checking what is already available.

Your verification flag is stored in the HQ Training Portal.

HQ Training route:
/recruit-verification

Recover the flag and submit it to Mission Control.

— Agent Trace`);
  });

  it('is case-sensitive and has no hidden or host objects', () => {
    expect(getVirtualNode('/home/recruit/Welcome.txt')).toBeNull();
    expect(getVirtualNode('/etc/passwd')).toBeNull();
    expect(getVirtualNode('/home/recruit/.hidden')).toBeNull();
  });
});

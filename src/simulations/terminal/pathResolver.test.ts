import { getTerminalPrompt, resolveVirtualPath } from './pathResolver';

describe('OPS-001 path resolver', () => {
  it.each([
    ['/home/recruit', 'welcome.txt', '/home/recruit/welcome.txt', 'file'],
    ['/home/recruit', 'training', '/home/recruit/training', 'folder'],
    ['/home/recruit', 'training/', '/home/recruit/training', 'folder'],
    ['/home/recruit', '.', '/home/recruit', 'folder'],
    ['/home/recruit', '..', '/home/recruit', 'folder'],
    ['/home/recruit/training', '.', '/home/recruit/training', 'folder'],
    ['/home/recruit/training', '..', '/home/recruit', 'folder'],
    ['/home/recruit/training', 'trace-note.txt', '/home/recruit/training/trace-note.txt', 'file'],
    ['/home/recruit/training', '../welcome.txt', '/home/recruit/welcome.txt', 'file'],
    ['/home/recruit', '/home/recruit', '/home/recruit', 'folder'],
    ['/home/recruit', '/home/recruit/training/', '/home/recruit/training', 'folder']
  ] as const)(
    'resolves %s + %s to canonical %s',
    (currentDirectory, input, expectedPath, expectedKind) => {
      expect(resolveVirtualPath(currentDirectory, input)).toMatchObject({
        kind: 'found',
        node: { kind: expectedKind, path: expectedPath }
      });
    }
  );

  it.each(['/', '/etc', '../../training', '/home/recruit/../../etc'])(
    'rejects paths outside the authored root: %s',
    (input) => {
      expect(resolveVirtualPath('/home/recruit', input)).toEqual({
        kind: 'outside-workspace',
        input
      });
    }
  );

  it('treats backslashes as authored characters rather than host separators', () => {
    expect(resolveVirtualPath('/home/recruit', 'training\\trace-note.txt')).toMatchObject({
      kind: 'missing'
    });
  });

  it('distinguishes missing objects and canonical prompts', () => {
    expect(resolveVirtualPath('/home/recruit', 'missing')).toEqual({
      kind: 'missing',
      input: 'missing',
      canonicalPath: '/home/recruit/missing'
    });
    expect(getTerminalPrompt('/home/recruit')).toBe('recruit@opslyce-hq:~$');
    expect(getTerminalPrompt('/home/recruit/training')).toBe('recruit@opslyce-hq:~/training$');
  });
});

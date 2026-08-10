import { getShortestTerminalTarget, prepareTerminalObjectCommand } from './assistance';

describe('Stage 7 Terminal assistance', () => {
  it('prepares the shortest valid object commands without executing them', () => {
    expect(
      prepareTerminalObjectCommand('read-file', '/home/recruit', '/home/recruit/welcome.txt')
    ).toBe('cat welcome.txt');
    expect(
      prepareTerminalObjectCommand('enter-folder', '/home/recruit', '/home/recruit/training')
    ).toBe('cd training');
    expect(
      prepareTerminalObjectCommand('list-contents', '/home/recruit/training', '/home/recruit')
    ).toBe('ls ..');
    expect(
      getShortestTerminalTarget('/home/recruit/training', '/home/recruit/training/trace-note.txt')
    ).toBe('trace-note.txt');
  });
});

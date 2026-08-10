import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { validateCodename } from '../../profile/codename';
import { CodenameRegistration } from './CodenameRegistration';

function Harness({ onAccepted }: Readonly<{ onAccepted(value: string): void }>) {
  const [value, setValue] = useState('');

  return (
    <CodenameRegistration
      value={value}
      onValueChange={setValue}
      onSubmit={(submittedValue) => {
        const result = validateCodename(submittedValue);
        if (result.valid) {
          onAccepted(result.value);
        }
        return result;
      }}
      onOpenSettings={vi.fn()}
      onReturnToTitle={vi.fn()}
    />
  );
}

describe('CodenameRegistration', () => {
  it('preserves a failed value for correction', async () => {
    const user = userEvent.setup();
    render(<Harness onAccepted={vi.fn()} />);

    const input = screen.getByRole('textbox', { name: 'Codename' });
    fireEvent.change(input, { target: { value: 'Agent!' } });
    await user.click(screen.getByRole('button', { name: 'Register codename' }));

    expect(input).toHaveValue('Agent!');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Use only letters, numbers, spaces, hyphens or underscores.'
    );
  });

  it('submits through the touch/click action', async () => {
    const user = userEvent.setup();
    const onAccepted = vi.fn();
    render(<Harness onAccepted={onAccepted} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Codename' }), {
      target: { value: '  Agent   Seven  ' }
    });
    await user.click(screen.getByRole('button', { name: 'Register codename' }));

    expect(onAccepted).toHaveBeenCalledWith('Agent Seven');
  });

  it('submits with Enter through normal form behaviour', async () => {
    const user = userEvent.setup();
    const onAccepted = vi.fn();
    render(<Harness onAccepted={onAccepted} />);

    const input = screen.getByRole('textbox', { name: 'Codename' });
    fireEvent.change(input, { target: { value: 'Key_9' } });
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(onAccepted).toHaveBeenCalledWith('Key_9');
  });
});

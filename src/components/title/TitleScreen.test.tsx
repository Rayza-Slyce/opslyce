import { render, screen } from '@testing-library/react';
import { createApplicantProfile, createOps001ActiveCheckpoint } from '../../profile/localProfile';
import { TitleScreen } from './TitleScreen';

const requiredProps = {
  onEnterHq: vi.fn(),
  onOpenSettings: vi.fn()
};

describe('TitleScreen', () => {
  it('shows fresh-device title actions without Continue Operation', () => {
    render(<TitleScreen {...requiredProps} profile={null} />);

    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Enter HQ' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue Operation' })).not.toBeInTheDocument();
  });

  it('shows an existing profile without fabricating resumable progress', () => {
    render(<TitleScreen {...requiredProps} profile={createApplicantProfile('Nova')} />);

    expect(screen.getByText('Nova')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue Operation' })).not.toBeInTheDocument();
  });

  it('shows Continue Operation for a valid typed resumable fixture', () => {
    render(
      <TitleScreen
        {...requiredProps}
        profile={createApplicantProfile('Nova')}
        resumableOperation={createOps001ActiveCheckpoint()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Continue Operation' })).toBeVisible();
  });

  it('does not show Continue Operation for invalid resumable input', () => {
    render(
      <TitleScreen
        {...requiredProps}
        profile={createApplicantProfile('Nova')}
        resumableOperation={{ missionId: 'OPS-001' }}
        onContinue={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Continue Operation' })).not.toBeInTheDocument();
  });
});

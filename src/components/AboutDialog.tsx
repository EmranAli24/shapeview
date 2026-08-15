import { useEffect, useRef } from 'react';

import { COURSE, GROUP_LABEL, INSTITUTION, TEAM_MEMBERS } from '../team';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Group and team roster, opened from the header badge. */
export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  /** Whatever had focus when the dialog opened — usually the badge that opened it. */
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        // Above the header (1200) and the narrow-viewport sidebar (1200).
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'var(--sv-scrim)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-about-title"
        // Clicks inside the card must not reach the backdrop's close handler.
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          maxHeight: '100%',
          overflowY: 'auto',
          animation: 'sv-fade .18s ease',
          background: 'var(--sv-surface)',
          border: '1px solid var(--sv-border)',
          borderRadius: 16,
          boxShadow: '0 18px 44px var(--sv-shadow)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '16px 16px 14px',
            borderBottom: '1px solid var(--sv-border)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              id="sv-about-title"
              className="sv-h"
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '-.02em',
                color: 'var(--sv-text)',
              }}
            >
              {GROUP_LABEL} · Team
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--sv-muted)',
                lineHeight: 1.55,
                marginTop: 4,
              }}
            >
              {COURSE}
              <br />
              {INSTITUTION}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="sv-btn-remove"
            aria-label="Close team details"
            onClick={onClose}
            style={{ fontSize: 18 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '4px 16px 14px' }}>
          {TEAM_MEMBERS.map((member, index) => (
            <div
              key={member.id + '-' + index}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                padding: '10px 0',
                borderBottom:
                  index === TEAM_MEMBERS.length - 1
                    ? 'none'
                    : '1px solid var(--sv-border-faint)',
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--sv-text-2)',
                  wordBreak: 'break-word',
                }}
              >
                {member.name}
              </span>
              <span
                className="sv-m"
                style={{
                  flex: 'none',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '.04em',
                  color: 'var(--sv-faint)',
                }}
              >
                {member.id}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

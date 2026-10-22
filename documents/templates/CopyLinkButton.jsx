import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

// Pass the public service or freelancer profile URL to share.
export default function CopyLinkButton({ url, label = 'Copy link' }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const timer = useRef();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(timer.current); };
  }, []);

  async function copy() {
    clearTimeout(timer.current);
    setCopied(false);
    setMessage('');
    setBusy(true);
    try {
      await navigator.clipboard.writeText(url ?? window.location.href);
      if (!mounted.current) return;
      setCopied(true);
      setMessage('Link copied. Ready to share.');
      timer.current = setTimeout(() => { setCopied(false); setMessage(''); }, 2400);
    } catch {
      if (mounted.current) setMessage('Could not copy. Copy the link from your address bar.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <StyledWrapper>
      <button type="button" className="copy-button" data-copied={copied}
        onClick={copy} disabled={busy} aria-busy={busy} aria-label={label}>
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" focusable="false">
            <rect x="8" y="8" width="13" height="13" rx="2" />
            <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
          </svg>
          {label}
        </span>
        <span aria-hidden="true">Copied</span>
      </button>
      <p className="copy-status" role="status">{message}</p>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  .copy-button {
    background-color: #f6f0e6;
    color: #59336d;
    width: 100px;
    height: 30px;
    border: none;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-weight: 600;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    transition-duration: 700ms;
  }
  .copy-button span {
    position: absolute;
    top: 50%;
    left: 50%;
    white-space: nowrap;
  }
  .copy-button span:first-child {
    color: #59336d;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transform: translate(-50%, -50%);
    transition: transform 500ms, opacity 500ms;
  }
  .copy-button svg { width: 12px; height: 12px; flex-shrink: 0; }
  .copy-button span:last-child {
    color: #ffffff;
    opacity: 0;
    transform: translate(-50%, 100%);
    height: 14px;
    line-height: 13px;
    transition: transform 500ms, opacity 500ms;
  }
  .copy-button[data-copied="true"] {
    background-color: #59336d;
    width: 120px;
    height: 40px;
    transition-delay: 100ms;
    transition-duration: 500ms;
  }
  .copy-button[data-copied="true"] span:first-child {
    transform: translate(-50%, -150%);
    opacity: 0;
  }
  .copy-button[data-copied="true"] span:last-child {
    transform: translate(-50%, -50%);
    opacity: 1;
    transition-delay: 300ms;
  }
  .copy-button:focus-visible { outline: 2px solid #59336d; outline-offset: 4px; }
  .copy-button:disabled { cursor: wait; }
  .copy-status { margin: 12px 0 0; min-height: 2.5em; max-width: 260px; color: #76513e; font: 13px/1.5 Arial, sans-serif; }
  @media (prefers-reduced-motion: reduce) {
    .copy-button, .copy-button span { transition: none !important; }
  }
`;

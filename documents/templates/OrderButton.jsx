import styled from 'styled-components';

// UI template: pass an onClick handler or type="submit" to connect an order flow.
// Pass a formatted price, including currency, e.g. "SLE 200".
export default function OrderButton({
  label = 'Order Now',
  price = 'SLE 200',
  type = 'button',
  ...props
}) {
  return (
    <StyledWrapper>
      <button type={type} data-tooltip={`Price: ${price}`} className="button"
        aria-label={`${label}, price: ${price}`} {...props}>
        <span className="button-wrapper" aria-hidden="true">
          <span className="text">{label}</span>
          <span className="icon">
            <svg viewBox="0 0 16 16" fill="currentColor" height={16} width={16}
              xmlns="http://www.w3.org/2000/svg" focusable="false">
              <path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 5l1.25 5h8.22l1.25-5H3.14zM5 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
            </svg>
          </span>
        </span>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: inline-flex;

  .button {
    --width: 100px;
    --height: 35px;
    --tooltip-height: 35px;
    --tooltip-width: 120px;
    --gap-between-tooltip-to-button: 18px;
    --button-color: #59336d;
    --tooltip-color: #f6f0e6;
    width: var(--width);
    height: var(--height);
    background: var(--button-color);
    position: relative;
    text-align: center;
    border-radius: 0.45em;
    font-family: Arial, sans-serif;
    font-size: 14px;
    transition: background 0.3s;
    border: 0;
    padding: 0;
    cursor: pointer;
  }

  .button::before {
    position: absolute;
    content: attr(data-tooltip);
    width: var(--tooltip-width);
    height: var(--tooltip-height);
    background-color: var(--tooltip-color);
    font-size: 0.9rem;
    color: #59336d;
    border-radius: .25em;
    line-height: var(--tooltip-height);
    white-space: nowrap;
    bottom: calc(var(--height) + var(--gap-between-tooltip-to-button) + 10px);
    left: calc(50% - var(--tooltip-width) / 2);
    box-shadow: 0 4px 12px rgb(64 32 79 / 12%);
  }

  .button::after {
    position: absolute;
    content: '';
    width: 0;
    height: 0;
    border: 10px solid transparent;
    border-top-color: var(--tooltip-color);
    left: calc(50% - 10px);
    bottom: calc(100% + var(--gap-between-tooltip-to-button) - 10px);
  }

  .button::after, .button::before {
    opacity: 0;
    visibility: hidden;
    transition: all 0.5s;
    pointer-events: none;
  }

  .text {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .button-wrapper, .text, .icon {
    overflow: hidden;
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    color: #ffffff;
  }

  .button-wrapper { top: 0; border-radius: inherit; }
  .text { top: 0; }
  .text, .icon { transition: top 0.5s; }

  .icon {
    top: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon svg { width: 24px; height: 24px; }
  .button:is(:hover, :focus-visible):not(:disabled) { background: #59336d; }
  .button:is(:hover, :focus-visible):not(:disabled) .text { top: -100%; }
  .button:is(:hover, :focus-visible):not(:disabled) .icon { top: 0; }
  .button:is(:hover, :focus-visible):not(:disabled)::before,
  .button:is(:hover, :focus-visible):not(:disabled)::after { opacity: 1; visibility: visible; }
  .button:is(:hover, :focus-visible):not(:disabled)::after {
    bottom: calc(var(--height) + var(--gap-between-tooltip-to-button) - 20px);
  }
  .button:is(:hover, :focus-visible):not(:disabled)::before {
    bottom: calc(var(--height) + var(--gap-between-tooltip-to-button));
  }
  .button:focus-visible { outline: 2px solid #59336d; outline-offset: 4px; }
  .button:disabled { background: #b9b0aa; cursor: not-allowed; }
  .button:disabled .text { color: #29252b; }
  @media (prefers-reduced-motion: reduce) {
    .button, .button::before, .button::after, .text, .icon { transition: none; }
  }
`;

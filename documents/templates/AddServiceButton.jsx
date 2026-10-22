import styled from 'styled-components';

// Connect onClick to the freelancer's service creation form.
export default function AddServiceButton({ label = 'Add Service', type = 'button', ...props }) {
  return (
    <StyledWrapper>
      <button type={type} className="button" aria-label={label} {...props}>
        <span className="button__text" aria-hidden="true">{label}</span>
        <span className="button__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width={24} viewBox="0 0 24 24"
            strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            stroke="currentColor" height={24} fill="none" className="svg" focusable="false">
            <line y2={19} y1={5} x2={12} x1={12} />
            <line y2={12} y1={12} x2={19} x1={5} />
          </svg>
        </span>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: inline-flex;

  .button {
    position: relative;
    width: 150px;
    height: 40px;
    cursor: pointer;
    display: flex;
    align-items: center;
    border: 1px solid #4b2a5d;
    background-color: #59336d;
    padding: 0;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
    font-size: 13px;
    overflow: hidden;
  }

  .button, .button__icon, .button__text {
    transition: all 0.3s;
  }

  .button .button__text {
    transform: translateX(15px);
    color: #fff;
    font-weight: 600;
    white-space: nowrap;
  }

  .button .button__icon {
    position: absolute;
    left: 0;
    transform: translateX(109px);
    height: 100%;
    width: 39px;
    background-color: #4b2a5d;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .button .svg {
    width: 30px;
    stroke: #fff;
  }

  .button:is(:hover, :focus-visible):not(:disabled) {
    background: #4b2a5d;
  }

  .button:is(:hover, :focus-visible):not(:disabled) .button__text {
    color: transparent;
  }

  .button:is(:hover, :focus-visible):not(:disabled) .button__icon {
    width: 148px;
    transform: translateX(0);
  }

  .button:active:not(:disabled) .button__icon {
    background-color: #40204f;
  }

  .button:active:not(:disabled) {
    border: 1px solid #40204f;
  }

  .button:focus-visible {
    outline: 2px solid #59336d;
    outline-offset: 4px;
  }

  .button:disabled { background-color: #b9b0aa; border-color: #b9b0aa; cursor: not-allowed; }
  .button:disabled .button__text { color: #29252b; }
  .button:disabled .button__icon { background-color: #e1dbd7; }
  .button:disabled .svg { stroke: #29252b; }

  @media (prefers-reduced-motion: reduce) {
    .button, .button__icon, .button__text { transition: none; }
  }
`;

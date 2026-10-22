import styled from 'styled-components';

// Original geometry, shadow, and width-based hover fill with brand colors.
export default function Button01({ children = 'Click me!', type = 'button', ...props }) {
  return (
    <StyledWrapper>
      <button type={type} {...props}>{children}</button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: inline-flex;

  button {
    padding: 15px 25px;
    border: unset;
    border-radius: 15px;
    color: #ffffff;
    z-index: 1;
    background: #59336d;
    position: relative;
    isolation: isolate;
    font-weight: 1000;
    font-size: 17px;
    -webkit-box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    transition: all 250ms;
    overflow: hidden;
    cursor: pointer;
  }

  button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0;
    border-radius: 15px;
    background-color: #e1dbd7;
    z-index: -1;
    -webkit-box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    transition: all 250ms;
  }

  button:hover:not(:disabled), button:focus-visible {
    color: #59336d;
  }

  button:hover:not(:disabled)::before, button:focus-visible::before {
    width: 100%;
  }

  button:focus-visible {
    outline: 2px solid #59336d;
    outline-offset: 4px;
  }

  button:disabled {
    color: #29252b;
    background: #b9b0aa;
    box-shadow: none;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    button, button::before { transition: none; }
  }
`;

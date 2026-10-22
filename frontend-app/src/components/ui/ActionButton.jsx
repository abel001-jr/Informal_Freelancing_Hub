import styled from 'styled-components'

/**
 * Animated expanding pill button — matches the supplied design reference.
 *
 * Props:
 *   variant  — 'logout' | 'login' | 'register' | 'primary' | 'danger' | 'success' | 'warning'
 *   label    — visible text on hover  (default: variant name)
 *   onClick  — click handler
 *   icon     — optional JSX override; defaults to the variant's built-in icon
 *   as       — 'button' (default) or 'a' to render as link
 *   href     — only when as='a'
 *   size     — 'sm' (36px) | 'md' (45px, default) | 'lg' (54px)
 */

// ── Colour map ────────────────────────────────────────────────────────────────
const COLORS = {
  logout:   { bg: '#B42332', hover: '#9a1d29' },
  login:    { bg: '#59336D', hover: '#40204F' },
  register: { bg: '#59336D', hover: '#40204F' },
  primary:  { bg: '#59336D', hover: '#40204F' },
  success:  { bg: '#166534', hover: '#14532d' },
  danger:   { bg: '#B42332', hover: '#9a1d29' },
  warning:  { bg: '#92400E', hover: '#78350f' },
  message:  { bg: '#365C85', hover: '#2d4f72' },
  post:     { bg: '#59336D', hover: '#40204F' },
}

// ── Size map ──────────────────────────────────────────────────────────────────
const SIZES = {
  sm: { base: '36px', expanded: '110px', icon: '14px', font: '0.95em', iconPad: '14px', textPad: '8px' },
  md: { base: '45px', expanded: '125px', icon: '17px', font: '1.1em',  iconPad: '20px', textPad: '10px' },
  lg: { base: '54px', expanded: '148px', icon: '20px', font: '1.2em',  iconPad: '22px', textPad: '12px' },
}

// ── Built-in icons ────────────────────────────────────────────────────────────
const ICONS = {
  logout: (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
    </svg>
  ),
  login: (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <path d="M352 96l64 0c17.7 0 32 14.3 32 32l0 256c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c53 0 96-43 96-96l0-256c0-53-43-96-96-96l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32zm-9.4 182.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z" />
    </svg>
  ),
  register: (
    <svg viewBox="0 0 640 512" aria-hidden="true">
      <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304l91.4 0C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7L29.7 512C13.3 512 0 498.7 0 482.3zM504 312l0-64-64 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l64 0 0-64c0-13.3 10.7-24 24-24s24 10.7 24 24l0 64 64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0 0 64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" />
    </svg>
  ),
  post: (
    <svg viewBox="0 0 448 512" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <path d="M64 0C28.7 0 0 28.7 0 64L0 352c0 35.3 28.7 64 64 64l96 0 0 80c0 6.1 3.4 11.6 8.8 14.3s11.9 2.1 16.8-1.5L309.3 416 448 416c35.3 0 64-28.7 64-64l0-288c0-35.3-28.7-64-64-64L64 0z" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 448 512" aria-hidden="true">
      <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
    </svg>
  ),
  danger: (
    <svg viewBox="0 0 384 512" aria-hidden="true">
      <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 128 512" aria-hidden="true">
      <path d="M96 64c0-17.7-14.3-32-32-32S32 46.3 32 64l0 256c0 17.7 14.3 32 32 32s32-14.3 32-32L96 64zM64 480a40 40 0 1 0 0-80 40 40 0 1 0 0 80z" />
    </svg>
  ),
}

// ── Styled components ─────────────────────────────────────────────────────────
const Btn = styled.button`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: ${({ $size }) => SIZES[$size].base};
  height: ${({ $size }) => SIZES[$size].base};
  border: none;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: width 0.3s ease, border-radius 0.3s ease, background-color 0.3s ease, transform 0.1s ease;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.18);
  background-color: ${({ $variant }) => COLORS[$variant]?.bg ?? COLORS.primary.bg};
  flex-shrink: 0;
  text-decoration: none;

  &:hover {
    width: ${({ $size }) => SIZES[$size].expanded};
    border-radius: 40px;
    background-color: ${({ $variant }) => COLORS[$variant]?.hover ?? COLORS.primary.hover};
  }

  &:active {
    transform: translate(2px, 2px);
  }

  &:focus-visible {
    outline: 2px solid ${({ $variant }) => COLORS[$variant]?.bg ?? COLORS.primary.bg};
    outline-offset: 3px;
  }
`

const Sign = styled.span`
  width: 100%;
  transition: width 0.3s ease, padding 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: ${({ $size }) => SIZES[$size].icon};
    height: ${({ $size }) => SIZES[$size].icon};
    fill: white;
    flex-shrink: 0;
  }

  ${Btn}:hover & {
    width: 30%;
    padding-left: ${({ $size }) => SIZES[$size].iconPad};
  }
`

const Text = styled.span`
  position: absolute;
  right: 0;
  width: 0;
  opacity: 0;
  color: white;
  font-size: ${({ $size }) => SIZES[$size].font};
  font-weight: 600;
  white-space: nowrap;
  transition: opacity 0.3s ease, width 0.3s ease, padding 0.3s ease;
  font-family: inherit;

  ${Btn}:hover & {
    opacity: 1;
    width: 70%;
    padding-right: ${({ $size }) => SIZES[$size].textPad};
  }
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function ActionButton({
  variant = 'primary',
  label,
  icon,
  onClick,
  size = 'md',
  as: Tag = 'button',
  href,
  title,
  type = 'button',
  disabled = false,
  className,
}) {
  const displayLabel = label ?? variant.charAt(0).toUpperCase() + variant.slice(1)
  const displayIcon  = icon ?? ICONS[variant] ?? ICONS.primary

  return (
    <Btn
      as={Tag}
      href={href}
      type={Tag === 'button' ? type : undefined}
      onClick={onClick}
      disabled={disabled}
      $variant={variant}
      $size={size}
      aria-label={displayLabel}
      title={title ?? displayLabel}
      className={className}
    >
      <Sign $size={size}>{displayIcon}</Sign>
      <Text $size={size}>{displayLabel}</Text>
    </Btn>
  )
}

# Button templates

## Marketplace landing page

Open [landing-page.html](landing-page.html) in a browser. Styles: [landing-page.css](landing-page.css); interactions: [landing-page.js](landing-page.js). No build or installation is required. Keep these three files together.

Inspired by the supplied sample's centered hero, quiet borders, generous spacing, alternating section backgrounds, and product grids. Adapted to FreelanceHub's mauve, cream, tan, and warm brown palette. Includes a freelancer section, service collection filters, responsive navigation, FAQs, and the sliding primary button treatment.

All calls to action navigate within the template. Project examples are illustrative; account creation, service requests, and payments are not connected. Google Fonts loads DM Sans and Manrope when available, with local sans-serif fallbacks. JavaScript syntax and HTML anchor/asset references were checked; browser rendering has not been verified in this environment.

## Button 01

Open [button-01.html](button-01.html) in a browser for a standalone preview. The React and styled-components version is [Button01.jsx](Button01.jsx).

Preserves the supplied code's 15px corners, 15px by 25px padding, 1000 font weight, soft `4px 8px 19px -3px` shadow, and 250ms width-based left-to-right fill. Default: primary mauve `#59336D` with white `#FFFFFF` text. Hover: soft pebble grey `#E1DBD7` slides across, with mauve text. Includes keyboard focus, disabled styling, and reduced-motion support.

To use the React template in an app, install `styled-components` there, copy the component into its source folder, then import it:

```jsx
import Button01 from './Button01';

<Button01 onClick={handleClick}>Post a Job</Button01>
```

The default label is “Click me!”. Native button props such as `disabled`, `type`, and `aria-label` are forwarded. This folder is a design reference; the app's existing button is managed separately.


## Order button - service requests and payments

Open [order-button.html](order-button.html) for both variants. React template: [OrderButton.jsx](OrderButton.jsx).

Preserves the supplied 100px by 35px shape, 0.45em corners, 24px cart, 0.5s vertical text-to-cart animation, and rising price tooltip with an 18px gap. Uses primary mauve `#59336D`, white button content, and a cream `#F6F0E6` tooltip with mauve text. Tooltip width is 120px to accommodate the formatted price; override `--tooltip-width` for longer amounts.

```jsx
import OrderButton from './OrderButton';

<OrderButton label="Order Now" price="SLE 200" onClick={requestService} />
<OrderButton label="Pay Now" price="SLE 200" onClick={startPayment} />
```

Requires `styled-components` in the consuming React app. Uses a native button for keyboard operation, repeats the hover effect on keyboard focus, and keeps an accessible label while the visible text moves away. Supports `disabled`, `type`, and other native button props. Prices in the preview are examples; supply the actual order amount. These are design templates; request submission and payment processing must be connected by the consuming app.


## Login and logout buttons

Open [auth-button.html](auth-button.html) for the preview. React template: [AuthButton.jsx](AuthButton.jsx), requiring `styled-components` in the consuming app.

Preserves the supplied 45px circle, expanding 125px pill with 40px corners, 17px icon, 0.3s expansion and text reveal with a separate 45px icon area, shadow, and 2px pressed movement. Uses primary mauve `#59336D` and white content. Login has an inward arrow; logout retains the supplied outward arrow. Keyboard focus reveals the label too. Includes accessible names, disabled styling, and reduced-motion support.

```jsx
import AuthButton from './AuthButton';

<AuthButton action="login" onClick={openLogin} />
<AuthButton action="logout" onClick={logout} />
// Reuse the shape for another action with a matching SVG icon:
<AuthButton label="Back" icon={<BackIcon />} onClick={goBack} />
```

Use `style={{ '--expanded-width': '160px' }}` for longer labels. These are design templates; authentication and navigation handlers must be connected in the consuming app.


## Add service button - freelancers

Open [add-service-button.html](add-service-button.html) for the preview. React template: [AddServiceButton.jsx](AddServiceButton.jsx), requiring `styled-components` in the consuming app.

Preserves the supplied 150px by 40px rectangular shape, 39px plus panel at a 109px offset, 148px expanded panel, 0.3s hover animation, and pressed state. Palette: primary mauve `#59336D`, darker panel `#4B2A5D`, pressed `#40204F`, and white content. The label is changed to Add Service and shifted 15px to fit the longer text beside the icon. Keyboard focus repeats the hover effect; accessible labeling, disabled styling, and reduced-motion support are included.

```jsx
import AddServiceButton from './AddServiceButton';

<AddServiceButton onClick={openCreateService} />
```

This is a design template. Connect the handler to the freelancer service creation screen in the consuming app.


## Copy link button - sharing services and freelancer profiles

Open [copy-link-button.html](copy-link-button.html). React template: [CopyLinkButton.jsx](CopyLinkButton.jsx), requiring `styled-components` in the consuming app.

Use as a small utility action beside a service title or freelancer profile. Preserves the 100px by 30px default, 10px corners, 120px by 40px confirmation state, and sliding text transitions. Cream default with mauve content; mauve confirmation with white content. Copy confirmation follows successful clipboard writing rather than focus. Resets after 2.4 seconds and announces success or failure. Includes reduced-motion and keyboard focus support.

```jsx
import CopyLinkButton from './CopyLinkButton';

<CopyLinkButton url={publicServiceUrl} />
<CopyLinkButton url={publicFreelancerProfileUrl} />
```

Clipboard access requires browser permission and a supported secure context (HTTPS or localhost). The standalone preview copies its own URL; opening it as a local file may restrict clipboard access. The component defaults to the current page URL when no URL is supplied. Supply public URLs suitable for sharing.


## Share button - services and freelancer profiles

Open [share-button.html](share-button.html). React template: [ShareButton.jsx](ShareButton.jsx), requiring `styled-components`.

Preserves the supplied pill shape, lifted hover, rotating share icon, pulse/ripple, and expanding social panel. Uses the mauve gradient and cream neutral surfaces, with mauve social hover fills. Includes keyboard activation, Escape dismissal, accessible network labels, and reduced-motion support. Social links open sharing pages; nothing is posted automatically.

```jsx
<ShareButton url={publicServiceUrl} title={serviceTitle} />
```

Pass a public URL when integrating. The standalone preview shares its own URL, so serve it over HTTP for a meaningful preview link. The existing Copy Link template remains a separate utility.

/** Static displacement field: bend the backdrop, never the navigation labels. */
const edgeMap = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><linearGradient id="x"><stop stop-color="#ff0000"/><stop offset=".04" stop-color="#800000"/><stop offset=".96" stop-color="#800000"/><stop offset="1" stop-color="#000000"/></linearGradient><linearGradient id="y" x2="0" y2="1"><stop stop-color="#00ff00"/><stop offset=".04" stop-color="#008000"/><stop offset=".96" stop-color="#008000"/><stop offset="1" stop-color="#000000"/></linearGradient></defs><rect width="100" height="100" fill="url(#x)"/><rect width="100" height="100" fill="url(#y)" style="mix-blend-mode:screen"/></svg>')}`;

export function NavigationRefraction() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      className="pointer-events-none absolute"
    >
      <defs>
        <filter
          id="dopilot-navigation-refraction"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={edgeMap}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="edge-map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="edge-map"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

/** Rebuilt displacement map: the PNG in the supplied reference is corrupt. */
export default function GlassFilters() {
  return (
    <svg
      className="glass-filter-definitions"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id="arduhub-glass"
          colorInterpolationFilters="sRGB"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
        >
          <feImage
            href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22600%22%20height%3D%22200%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22r%22%3E%3Cstop%20stop-color%3D%22%23008000%22%2F%3E%3Cstop%20offset%3D%22.18%22%20stop-color%3D%22%23808000%22%2F%3E%3Cstop%20offset%3D%22.82%22%20stop-color%3D%22%23808000%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23ff8000%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22g%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23800000%22%2F%3E%3Cstop%20offset%3D%22.2%22%20stop-color%3D%22%23808000%22%2F%3E%3Cstop%20offset%3D%22.8%22%20stop-color%3D%22%23808000%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2380ff00%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22600%22%20height%3D%22200%22%20fill%3D%22url(%23r)%22%2F%3E%3Crect%20width%3D%22600%22%20height%3D%22200%22%20fill%3D%22url(%23g)%22%20style%3D%22mix-blend-mode%3Alighten%22%2F%3E%3C%2Fsvg%3E"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="-12"
            xChannelSelector="R"
            yChannelSelector="G"
            result="redShift"
          />
          <feColorMatrix
            in="redShift"
            type="matrix"
            values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
            result="red"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="-15"
            xChannelSelector="R"
            yChannelSelector="G"
            result="greenShift"
          />
          <feColorMatrix
            in="greenShift"
            type="matrix"
            values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
            result="green"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="-18"
            xChannelSelector="R"
            yChannelSelector="G"
            result="blueShift"
          />
          <feColorMatrix
            in="blueShift"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
            result="blue"
          />
          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}

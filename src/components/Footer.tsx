const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="igGradientFooter" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F58529" />
        <stop offset="35%" stopColor="#DD2A7B" />
        <stop offset="70%" stopColor="#8134AF" />
        <stop offset="100%" stopColor="#515BD4" />
        <animateTransform attributeName="gradientTransform" type="rotate" from="0 12 12" to="360 12 12" dur="6s" repeatCount="indefinite" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#igGradientFooter)" strokeWidth="2" />
    <circle cx="12" cy="12" r="4" stroke="url(#igGradientFooter)" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.25" fill="url(#igGradientFooter)" />
  </svg>
);

export const Footer: React.FC = () => (
  <footer className="max-w-4xl mx-auto w-full px-3 sm:px-4 pt-4 pb-6">
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-gray-500 text-left">
        © 2026 Salón Legendario todos los derechos reservados. | Desarrollado por{' '}
        <a
          href="https://waveframe.com.ar/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline text-gray-400 hover:text-amber-400 transition-colors"
        >
          WaveFrame Studio
        </a>
        .
      </p>
      <a
        href="https://www.instagram.com/salonlegendario"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 text-amber-400 hover:text-amber-300 transition-colors duration-300"
        aria-label="Síguenos en Instagram"
      >
        <InstagramIcon />
      </a>
    </div>
  </footer>
);

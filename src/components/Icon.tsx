export function Icon({ name, size = 20 }: { name: 'ship' | 'arrow' | 'check' | 'code' | 'shield' | 'github' | 'copy' | 'box' | 'layers'; size?: number }) {
  const paths = {
    ship: <><path d="M3 16h18l-4 5H7z"/><path d="M11 2v11H4zm3 3 6 8h-6z"/></>,
    arrow: <><path d="M4 12h15m-6-6 6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    code: <path d="m8 5-7 7 7 7m8-14 7 7-7 7m-3-17-3 20"/>,
    shield: <><path d="m12 2 8 3v6c0 5-8 10-8 10S4 16 4 11V5z"/><path d="m8 11 3 3 5-6"/></>,
    github: <><path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1 .2-2-1-3 4-.4 7-2 7-6a5 5 0 0 0-1-3c.3-1 .3-3-.2-4C18 2 16 3 15 4a12 12 0 0 0-6 0C8 3 6 2 4 2c-.5 1-.5 3 0 4a5 5 0 0 0-1 3c0 4 3 6 7 6-1 1-1 2-1 3v4"/></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
    box: <><path d="m12 2 9 5v10l-9 5-9-5V7zm0 10 9-5M12 12 3 7m9 5v10M7 4l9 5"/></>,
    layers: <><path d="m12 2 10 5-10 5L2 7zm-10 10 10 5 10-5M2 17l10 5 10-5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={name === 'ship' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

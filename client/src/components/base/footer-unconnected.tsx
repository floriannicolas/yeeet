export const FooterUnconnected = () => {
  return (
    <footer className="flex bg-black text-muted-foreground text-xs z-10 h-16 shrink-0 items-center justify-center gap-2 text-center px-6">
      © {new Date().getFullYear()} Yeeet - All rights reserved
    </footer>
  );
};
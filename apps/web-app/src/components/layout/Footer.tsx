export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <p className="footer__copy">
          &copy; {year} Carbon Trading Platform. All rights reserved.
        </p>
        <nav aria-label="Footer navigation" className="footer__nav">
          <a href="/terms" className="footer__link">
            Terms of Service
          </a>
          <a href="/privacy" className="footer__link">
            Privacy Policy
          </a>
          <a href="/support" className="footer__link">
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}

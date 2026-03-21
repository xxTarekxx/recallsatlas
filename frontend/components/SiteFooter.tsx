export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <p className="site-footer-copy">
        &copy; {year} RecallsAtlas. Recall data aggregated for public use.
      </p>
      <p className="site-footer-disclaimer">
        All recall information on RecallsAtlas.com is aggregated from the U.S.
        Food &amp; Drug Administration (FDA) and the National Highway Traffic
        Safety Administration (NHTSA) and is provided for informational purposes
        only. RecallsAtlas is not affiliated with or endorsed by the FDA or
        NHTSA. Any translations are AI-generated and may not be 100% accurate —
        always verify recall details directly with the official source. To
        confirm recall information, contact the FDA at{" "}
        <a
          href="tel:18002679675"
          className="site-footer-link"
        >
          1-800-267-9675
        </a>{" "}
        or visit{" "}
        <a
          href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
          target="_blank"
          rel="noopener noreferrer"
          className="site-footer-link"
        >
          FDA.gov
        </a>
        . RecallsAtlas is not responsible for any decisions made based on
        information found on this site.
      </p>
    </footer>
  );
}

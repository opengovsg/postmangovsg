import { i18n } from '@lingui/core'
import cx from 'classnames'

import { OutboundLink } from 'react-ga'

import styles from './Footer.module.scss'

import companyLogo from 'assets/img/brand/company-logo-full-color.svg'

import { LINKS } from 'config'

const Footer = () => (
  <footer className={styles.landingFooter}>
    <div className={cx(styles.footerSection, styles.footerSectionBottomBorder)}>
      <div className={styles.footerTagline}>
        <span className={styles.taglineName}>Postman</span>
        <span className={styles.taglineCaption}>
          Reach out to citizens in minutes
        </span>
      </div>
      <div className={styles.footerLinks}>
        <OutboundLink
          eventLabel={i18n._(LINKS.guideUrl)}
          to={i18n._(LINKS.guideUrl)}
          target="_blank"
        >
          User Guide
        </OutboundLink>
        <OutboundLink
          className={styles.navLink}
          eventLabel={i18n._(LINKS.privacyUrl)}
          to={i18n._(LINKS.privacyUrl)}
          target="_blank"
        >
          Privacy
        </OutboundLink>
        <OutboundLink
          eventLabel={i18n._(LINKS.tncUrl)}
          to={i18n._(LINKS.tncUrl)}
          target="_blank"
        >
          Terms of Use
        </OutboundLink>
        <OutboundLink
          eventLabel={i18n._(LINKS.reportBugUrl)}
          to={i18n._(LINKS.reportBugUrl)}
          target="_blank"
        >
          Report Vulnerability
        </OutboundLink>
      </div>
    </div>
    <div className={styles.footerSection}>
      <div>
        <a
          className={styles.footerLogo}
          target="_blank"
          href="https://open.gov.sg"
          rel="noreferrer"
        >
          <span className={styles.builtby}> Built by </span>
          <img className={styles.logo} src={companyLogo} />
        </a>
      </div>
      <div className={styles.footerSocials}>
        <div className={styles.footerSocialsLinks}>
          <a
            target="_blank"
            href="https://linkedin.com/company/open-government-products"
            rel="noreferrer"
          >
            <i className="bx bxl-linkedin"></i>
          </a>
          <a
            target="_blank"
            href="https://www.facebook.com/opengovsg/"
            rel="noreferrer"
          >
            <i className="bx bxl-facebook"></i>
          </a>
          <a target="_blank" href="https://open.gov.sg" rel="noreferrer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="currentColor"
              viewBox="0 0 32 32"
            >
              <mask
                id="uz33y1jqaa"
                width="9"
                height="24"
                x="2"
                y="4"
                maskUnits="userSpaceOnUse"
              >
                <path fill="#EEE" d="M2.286 4h8.47v23.999h-8.47V4z"></path>
              </mask>
              <g mask="url(#uz33y1jqaa)">
                <path
                  fill="currentColor"
                  fillRule="evenodd"
                  d="M10.676 25.58c.077-.137.1-.298.065-.452-.035-.154-.126-.288-.255-.375-2.78-1.868-4.617-5.09-4.617-8.754 0-3.663 1.837-6.884 4.617-8.753.129-.087.22-.22.255-.375.035-.153.012-.315-.065-.452L9.489 4.311c-.041-.073-.097-.137-.163-.187-.066-.05-.142-.087-.222-.107-.08-.02-.164-.022-.245-.008-.081.014-.16.045-.228.091C4.815 6.614 2.286 11.003 2.286 16c0 4.997 2.53 9.385 6.345 11.899.069.046.147.077.228.091.081.014.165.012.245-.008.08-.02.156-.056.222-.106.066-.05.121-.115.163-.188l1.187-2.108z"
                  clipRule="evenodd"
                ></path>
              </g>
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M22.646 4.311L21.459 6.42c-.077.136-.1.298-.065.451.035.154.126.288.255.375 2.78 1.868 4.616 5.09 4.616 8.754 0 3.663-1.837 6.885-4.617 8.753-.128.087-.219.221-.254.375s-.012.315.065.452l1.187 2.108c.041.073.097.137.163.188.066.05.142.086.222.106.08.02.164.022.245.008.081-.014.159-.045.228-.091 3.816-2.514 6.345-6.902 6.345-11.9 0-4.996-2.53-9.385-6.345-11.899-.07-.046-.147-.077-.228-.091-.081-.014-.165-.012-.245.008-.08.02-.156.056-.222.107-.066.05-.122.114-.163.187"
                clipRule="evenodd"
              ></path>
            </svg>
          </a>
        </div>
        <a
          className={styles.footerCopyright}
          target="_blank"
          href="https://open.gov.sg"
          rel="noreferrer"
        >
          <span>
            &copy; {new Date().getFullYear()} Open Government Products,&nbsp;
          </span>
          <span>Government Technology Agency of Singapore</span>
        </a>
      </div>
    </div>
  </footer>
)

export default Footer

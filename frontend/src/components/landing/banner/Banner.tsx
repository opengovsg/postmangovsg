import { RefObject, useState } from 'react'
import cx from 'classnames'

import styles from './Banner.module.scss'

const Banner = ({ innerRef }: { innerRef?: RefObject<HTMLDivElement> }) => {
  const [open, setOpen] = useState(false)

  const toggleOpen = () => setOpen((open) => !open)

  return (
    <div className={styles.container} ref={innerRef}>
      <div className={styles.banner}>
        <div className={styles.icon}>
          <span className={cx(styles.sgdsIcon, styles.sgCrestIcon)}></span>
        </div>
        <div>
          A Singapore Government Agency Website.{' '}
          <button className={styles.linkButton} onClick={toggleOpen}>
            <span className={styles.link}>How to identify?</span>
            <i
              className={cx(styles.icon, 'bx', {
                'bx-chevron-down': !open,
                'bx-chevron-up': open,
              })}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.info}>
          <div className={styles.section}>
            <div className={styles.icon}>
              <i className="bx bxs-bank"></i>
            </div>
            <div className={styles.content}>
              <div className={styles.title}>
                Official website links end with .gov.sg
              </div>
              <div>
                Government agencies communicate via <strong>.gov.sg</strong>{' '}
                websites
                <br />
                (e.g. go.gov.sg/open).{' '}
                <a
                  href="https://go.gov.sg/trusted-sites"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Trusted websites <i className="bx bx-link-external" />
                </a>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.icon}>
              <i className="bx bxs-lock-alt"></i>
            </div>
            <div className={styles.content}>
              <div className={styles.title}>Secure websites use HTTPS</div>
              <div>
                Look for a lock (<i className="bx bxs-lock-alt"></i>) or{' '}
                {'https://'} as an added precaution.
                <br />
                Share sensitive information only on official, secure websites.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Banner

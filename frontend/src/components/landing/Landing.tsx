import { i18n } from '@lingui/core'

import cx from 'classnames'

import Lottie from 'lottie-react'
import { createRef, useContext, useEffect, useState } from 'react'

import { OutboundLink } from 'react-ga'
import { Navigate, useNavigate } from 'react-router-dom'

import styles from './Landing.module.scss'
import Banner from './banner'

import Navbar from './nav-bar'

import companyLogo from 'assets/img/brand/company-logo.svg'
import channelsImg from 'assets/img/landing/channels.png'
import landingHeroImg from 'assets/img/landing/landing-hero.png'
import userImg from 'assets/img/landing/moe-circle.png'
import moeAgencyImg from 'assets/img/landing/moe-gray.png'
import mohAgencyImg from 'assets/img/landing/moh-gray.png'
import momAgencyImg from 'assets/img/landing/mom-gray.png'
import onboardingImg from 'assets/img/landing/onboard.png'
import whyUse1 from 'assets/img/why-use-1.png'
import whyUse2 from 'assets/img/why-use-2.png'
import whyUse3 from 'assets/img/why-use-3.png'

import landingAnimation from 'assets/lottie/landing.json'

import { InfoBanner, PrimaryButton } from 'components/common'
import { LINKS } from 'config'

import { AuthContext } from 'contexts/auth.context'
import { getLandingStats } from 'services/stats.service'

const isIE11 = !!window.MSInputMethodContext && !!(document as any).documentMode

const Landing = () => {
  const { isAuthenticated } = useContext(AuthContext)
  const [sentMessages, setSentMessages] = useState('0')
  const navigate = useNavigate()

  const bannerRef = createRef<HTMLDivElement>()
  const infoBannerRef = createRef<HTMLDivElement>()

  useEffect(() => {
    if (isAuthenticated) return
    async function getSentMessages() {
      const stats = await getLandingStats()
      if (stats) {
        setSentMessages(stats.toLocaleString())
      }
    }
    void getSentMessages()
  }, [isAuthenticated])

  useEffect(() => {
    function recalculateBannerPos() {
      const govBannerHeight = bannerRef.current?.offsetHeight as number
      const scrollTop = (document.documentElement.scrollTop ||
        document.body.scrollTop) as number
      if (infoBannerRef.current) {
        const offsetTop =
          scrollTop >= govBannerHeight ? 0 : govBannerHeight - scrollTop
        const infoBannerHeight = infoBannerRef.current?.offsetHeight as number
        if (scrollTop > govBannerHeight + infoBannerHeight) {
          infoBannerRef.current.style.position = 'fixed'
          infoBannerRef.current.style.top = `${offsetTop}px`
        } else {
          infoBannerRef.current.style.position = 'relative'
        }
      }
    }
    window.addEventListener('scroll', recalculateBannerPos)
    return () => {
      window.removeEventListener('scroll', recalculateBannerPos)
    }
  })

  if (isAuthenticated) {
    return <Navigate to="/campaigns" />
  }

  function directToSignIn() {
    navigate('/login')
  }

  const trustedAgencies = [
    { img: mohAgencyImg, alt: 'MOH' },
    { img: momAgencyImg, alt: 'MOM' },
    { img: moeAgencyImg, alt: 'MOE' },
  ]

  const reasons = [
    {
      img: whyUse1,
      firstHeader: 'Multichannel',
      firstText:
        'No more switching between your Outlook and SMS portal. You can reach your recipients via SMS and email in the same platform.',
      secondHeader: 'Personalised messages',
      secondText: 'Add useful, custom details for your recipients.',
    },
    {
      img: whyUse2,
      firstHeader: 'Schedule your campaign',
      firstText:
        'Send your messages anytime you want by scheduling them ahead of time.',
      secondHeader: 'Track delivery of your messages',
      secondText: 'Understand how many of your messages was sent successfully.',
    },
    {
      img: whyUse3,
      firstHeader: 'Automatically triggered API',
      firstText:
        'Modern, cost-effective and compliant way to automatically trigger and send your emails. Focus on building your systems and leave email sending to us.',
    },
  ]

  return (
    <div className={styles.landing}>
      <Banner innerRef={bannerRef} />
      <InfoBanner innerRef={infoBannerRef} />
      <div className={styles.topContainer}>
        <Navbar />
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <h1 className={styles.headerText}>
              Reach out to citizens in minutes
            </h1>
            <div
              className={cx(styles.sentMessages, {
                [styles.ready]: sentMessages !== '0',
              })}
            >
              <span className={styles.numOfMessages}>{sentMessages}</span>
              <span className={styles.text}>messages sent</span>
            </div>
            <div className={styles.signInRow}>
              <PrimaryButton
                className={styles.signInButton}
                onClick={directToSignIn}
              >
                Sign in
              </PrimaryButton>
              <OutboundLink
                className={styles.contactUs}
                eventLabel={i18n._(LINKS.contactUsUrl)}
                to={i18n._(LINKS.contactUsUrl)}
                target="_blank"
              >
                Need help?<span>Talk to us</span>
              </OutboundLink>
            </div>
          </div>
          <div className={styles.landingAnimation}>
            {isIE11 ? (
              <img src={landingHeroImg} className={styles.landingHero} alt="" />
            ) : (
              <Lottie
                loop={false}
                autoplay={true}
                animationData={landingAnimation}
                rendererSettings={{
                  preserveAspectRatio: 'xMidYMid slice',
                }}
              />
            )}
          </div>
        </div>
        <div className={styles.agencyContainer}>
          <h2 className={styles.agencyHeader}>Trusted by these agencies</h2>
          <div className={styles.agencies}>
            {trustedAgencies.map((agency) => (
              <img src={agency.img} alt={agency.alt} key={agency.img} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.channelContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.channelImg}>
            <img src={channelsImg} alt="Channels" />
          </div>
          <div className={styles.channelDescription}>
            <span>CHANNELS</span>

            <h4>Email</h4>
            <p>
              Go digital and send personalized emails. No more letterheads and
              stamps. Use our password-protected feature to send sensitive
              information like a payslip or personal PIN to your recipients.{' '}
              <OutboundLink
                eventLabel="https://go.gov.sg/postman-email"
                to="https://go.gov.sg/postman-email"
                target="_blank"
              >
                Read more
              </OutboundLink>
            </p>

            <h4>SMS</h4>
            <p>
              Move away from calling. Send transactional SMS easily through our
              Twilio integration. Remind citizens to come for their
              appointments. The possibilities are endless.{' '}
              <OutboundLink
                eventLabel="https://go.gov.sg/postman-sms"
                to="https://go.gov.sg/postman-sms"
                target="_blank"
              >
                Read more
              </OutboundLink>
            </p>

            <h4>Telegram</h4>
            <p>
              Telegram is the #1 messaging app for Singaporeans aged 35 and
              under. Engage your subscribers regularly through our Telegram bot
              broadcasting feature. You can easily send private messages to your
              agency employees for a fitness event or engage citizens for a
              donation drive.{' '}
              <OutboundLink
                eventLabel="https://go.gov.sg/postman-telegram"
                to="https://go.gov.sg/postman-telegram"
                target="_blank"
              >
                Read more
              </OutboundLink>
            </p>
          </div>
        </div>
      </div>

      <div className={styles.whyUsePostman}>
        <div className={styles.innerContainer}>
          <h1>Why use Postman?</h1>
          <div className={styles.reasons}>
            {reasons.map((reason) => (
              <div className={styles.reason} key={reason.img}>
                <img
                  src={reason.img}
                  alt={`${reason.firstHeader} ${reason.secondHeader}`}
                />
                <div className={styles.textContainer}>
                  <h3>{reason.firstHeader}</h3>
                  <p>{reason.firstText}</p>
                  {reason.secondHeader && <h3>{reason.secondHeader}</h3>}
                  {reason.secondText && <p>{reason.secondText}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.lineBreak} />

          <div className={styles.testimonial}>
            <span className={cx(styles.openInvertedComma, styles.comma)}>
              &#8220;
            </span>
            <div className={styles.inner}>
              <img className={styles.desktopImg} src={userImg} alt="User" />
              <div className={styles.textContainer}>
                <p className={styles.longText}>
                  The email version is quite straightforward. Thumbs up!
                </p>
                <div className={styles.agencyRow}>
                  <span>User from MOE</span>
                </div>
              </div>
            </div>
            <span className={cx(styles.closeInvertedComma, styles.comma)}>
              &#8221;
            </span>
          </div>
        </div>
      </div>

      <div className={styles.onboarding}>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <h2>Start using Postman today</h2>
            <p>
              It is easy to get started with your gov.sg email account. For non
              gov.sg email users, please contact us. We will review your request
              within 3 business days.
            </p>

            <div className={styles.buttonRow}>
              <PrimaryButton
                className={styles.getStartedButton}
                onClick={directToSignIn}
              >
                <span>Get started</span>
              </PrimaryButton>
              <OutboundLink
                eventLabel={i18n._(LINKS.contactUsUrl)}
                to={i18n._(LINKS.contactUsUrl)}
                target="_blank"
              >
                Contact us
              </OutboundLink>
            </div>
          </div>
          <div className={styles.imageContainer}>
            <img
              className={styles.onboardingImg}
              src={onboardingImg}
              alt="Onboarding"
            />
          </div>
        </div>
      </div>

      <footer className={styles.bottomContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.linksContainer}>
            <div className={styles.navLinks}>
              <div className={styles.header}>
                <span className={styles.title}>Postman</span>
                <span className={styles.text}>
                  Reach out to citizens in minutes
                </span>
              </div>
              <OutboundLink
                eventLabel={i18n._(LINKS.guideUrl)}
                to={i18n._(LINKS.guideUrl)}
                target="_blank"
              >
                Guide
              </OutboundLink>
              <OutboundLink
                eventLabel={i18n._(LINKS.contributeUrl)}
                to={i18n._(LINKS.contributeUrl)}
                target="_blank"
              >
                Contribute
              </OutboundLink>
            </div>

            <div className={styles.builtBy}>
              <span>Built by</span>
              <img src={companyLogo} alt="logo" />
            </div>
          </div>
          <div className={styles.lineBreak} />
          <div className={styles.footer}>
            <div className={styles.links}>
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
            <span>
              &copy; {new Date().getFullYear()} Open Government Products
            </span>
            <div className={styles.builtByMobile}>
              <span>Built by</span>
              <img src={companyLogo} alt="logo" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing

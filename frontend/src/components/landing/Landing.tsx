import { i18n } from '@lingui/core'

import cx from 'classnames'

import Lottie from 'lottie-react'
import { createRef, useContext, useEffect, useState } from 'react'

import { OutboundLink } from 'react-ga'
import { Redirect, useHistory } from 'react-router-dom'

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
import onboardingImg from 'assets/img/landing/onboard.svg'

import landingAnimation from 'assets/lottie/landing.json'
import whyUse1 from 'assets/mp4/why-use-1.mp4'
import whyUse2 from 'assets/mp4/why-use-2.mp4'
import whyUse3 from 'assets/mp4/why-use-3.mp4'
import { InfoBanner, PrimaryButton } from 'components/common'
import { LINKS } from 'config'

import { AuthContext } from 'contexts/auth.context'
import { getLandingStats } from 'services/stats.service'

const isIE11 = !!window.MSInputMethodContext && !!(document as any).documentMode

const Landing = () => {
  const { isAuthenticated } = useContext(AuthContext)
  const [sentMessages, setSentMessages] = useState('0')
  const history = useHistory()

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
    getSentMessages()
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
    return <Redirect to="/campaigns" />
  }

  function directToSignIn() {
    history.push('/login')
  }

  const trustedAgencies = [
    { img: mohAgencyImg, alt: 'MOH' },
    { img: momAgencyImg, alt: 'MOM' },
    { img: moeAgencyImg, alt: 'MOE' },
  ]

  const reasons = [
    {
      video: whyUse1,
      firstHeader: 'Multichannel',
      firstText:
        'No more switching between your Outlook and SMS portal. You can reach your recipients via SMS and email in the same platform.',
      secondHeader: 'Personalised messages',
      secondText: 'Add useful, custom details for your recipients.',
    },
    {
      video: whyUse2,
      firstHeader: 'No more typing +65',
      firstText:
        "We took care of the country code so you don't have to enter +65 in your Excel file.",
      secondHeader: 'Send in bulk',
      secondText:
        "You don't have to BCC everyone and wait for Outlook to slowly send a batch of 1000 emails. Sit back and let Postman do the work for you.",
    },
    {
      video: whyUse3,
      firstHeader: 'Stop your campaign',
      firstText:
        'You can stop your campaign with a click of a button even when sending is in progress.',
      secondHeader: "See past campaigns' stats easily",
      secondText:
        "You can see summary stats from Postman's campaign landing page for past campaigns.",
    },
  ]

  const questions = [
    {
      text: 'What can Postman do?',
      answer: (
        <p>
          Postman lets public officers mass send messages to citizens through
          SMS and email via a user interface, with minimal setup required.
        </p>
      ),
    },
    {
      text: 'What problems are Postman solving?',
      answer: (
        <ol>
          <li>
            <b>Communication is manual: </b>Public officers are still calling
            and sending individual messages to citizens.
          </li>
          <li>
            <b>Existing tools do not meet users&apos; needs: </b>Outlook does
            not support mass sending, as it is capped at 1000 emails at a time.
          </li>
          <li>
            <b>No official source of information: </b>Citizens currently receive
            messages from the government via many channels, and consequently are
            at risk of being phished.
          </li>
        </ol>
      ),
    },
    {
      text: 'Is Postman free?',
      answer: (
        <p>
          Sending an email is free. SMS will be charged based on Twilio&apos;s
          SMS rates.
        </p>
      ),
    },
    {
      text: 'Is Postman secure?',
      answer: (
        <p>
          We recommend that you do not add any sensitive information to the
          messages. Some of our users generate a recipient specific unique link
          that opens up to a locked page. When in doubt, you should follow IM8’s
          guidelines on data classification.
        </p>
      ),
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

            <h4 className={styles.new}>Telegram</h4>
            <p>
              Telegram is the #1 messaging app for Singaporeans aged 35 and
              under. Engage your subscribers regularly through our Telegram bot
              broadcasting feature. You can easily send private messages to your
              agency employees for a fitness event or engage citizens for a
              donation drive.
            </p>

            <h4>Email</h4>
            <p>
              Go digital and send personalized emails. No more letterheads and
              stamps. Use our password-protected feature to send sensitive
              information like a payslip or personal PIN to your recipients.
            </p>

            <h4>SMS</h4>
            <p>
              Move away from calling. Send transactional SMS easily through our
              Twilio integration. Remind citizens to come for their
              appointments. The possibilities are endless.
            </p>

            <OutboundLink
              className={styles.link}
              eventLabel={i18n._(LINKS.guideUrl)}
              to={i18n._(LINKS.guideUrl)}
              target="_blank"
            >
              <PrimaryButton className={styles.button}>
                Learn More <i className="bx bx-right-arrow-alt" />
              </PrimaryButton>
            </OutboundLink>
          </div>
        </div>
      </div>

      <div className={styles.whyUsePostman}>
        <div className={styles.innerContainer}>
          <h1>Why use Postman?</h1>
          <div className={styles.reasons}>
            {reasons.map((reason) => (
              <div className={styles.reason} key={reason.video}>
                <video autoPlay loop muted playsInline>
                  <source src={reason.video} type="video/mp4" />
                </video>
                <div className={styles.textContainer}>
                  <h3>{reason.firstHeader}</h3>
                  <p>{reason.firstText}</p>
                  <h3>{reason.secondHeader}</h3>
                  <p>{reason.secondText}</p>
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

      <div className={styles.faq}>
        <div className={styles.innerContainer}>
          <h1>Frequently asked questions</h1>
          {questions.map((question) => (
            <div className={styles.question} key={question.text}>
              <h3>{question.text}</h3>
              {question.answer}
            </div>
          ))}
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

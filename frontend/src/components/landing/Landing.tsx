import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'
import cx from 'classnames'

import {
  GUIDE_URL,
  CONTACT_US_URL,
  CONTRIBUTE_URL,
  PRIVACY_URL,
  TC_URL,
  REPORT_BUG_URL,
} from 'config'
import PrimaryButton from 'components/common/primary-button'
import Navbar from './nav-bar'
import Banner from './banner'
import { AuthContext } from 'contexts/auth.context'

import styles from './Landing.module.scss'
import companyLogo from 'assets/img/brand/company-logo.svg'
import landingImg from 'assets/img/landing/landing-hero.png'

import arrowRight from 'assets/img/landing/arrow-right.svg'
import mohAgencyImg from 'assets/img/landing/moh-gray.png'
import moeAgencyImg from 'assets/img/landing/moe-gray.png'
import momAgencyImg from 'assets/img/landing/mom-gray.png'

import userImg from 'assets/img/landing/moe-circle.png'

import onboardingImg from 'assets/img/landing/onboard.svg'

import whyUse1 from 'assets/mp4/why-use-1.mp4'
import whyUse2 from 'assets/mp4/why-use-2.mp4'
import whyUse3 from 'assets/mp4/why-use-3.mp4'

const Landing = () => {
  const authContext = useContext(AuthContext)

  if (authContext.isAuthenticated) {
    return (
      <Redirect to='/campaigns'></Redirect>
    )
  }

  function directToSignIn() {
    window.location.href = '/signin'
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
      firstText: 'No more toggling between your Outlook and SMS portal. You can reach your recipients via SMS and email in the same platform.',
      secondHeader: 'Personalised messages',
      secondText: 'Add in useful and specific details for your recipients.',
    },
    {
      video: whyUse2,
      firstHeader: 'No more typing +65',
      firstText: 'We took care of the country code so you don\'t have to enter +65 in your excel file.',
      secondHeader: 'Send in bulk',
      secondText: 'You don\'t have to BCC everyone and wait for Outlook to slowly send a batch of 1000 emails. Sit back and let Postman do the work for you.',
    },
    {
      video: whyUse3,
      firstHeader: 'Stop your campaign',
      firstText: 'You can stop your campaign easily with a click of a button even if you already started sending.',
      secondHeader: 'See past campaigns stats easily',
      secondText: 'You can see summary stats from Postman’s campaign landing page for past campaigns.',
    },
  ]

  const questions = [
    { text: 'Is Postman free?', answer: 'Sending an email is free. SMS will be charged based on Twilio’s SMS rates.' },
    { text: 'Is Postman secure?', answer: 'We recommend that you don’t put any sensitive information in the sms content. Some of our users generate a recipient specific unique link that opens up to a locked page. When in doubt, you should follow IM8’s guidelines on data classification.' },
  ]

  function getYear() {
    return new Date().getFullYear()
  }

  return (
    <>
      <Banner></Banner>
      <div className={styles.topContainer}>
        <Navbar></Navbar>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <h1 className={styles.headerText}>Reach out to the citizens in minutes</h1>
            <h2 className={styles.sentMessages}>
              <span className={styles.numOfMessages}>275,000</span>
              <span className={styles.text}>sent messages</span>
            </h2>
            <div className={styles.signInRow}>
              <PrimaryButton className={styles.signInButton} onClick={directToSignIn}>
                Sign in <img className={styles.arrowRight} src={arrowRight} alt="Right arrow"/>
              </PrimaryButton>
              <div className={styles.signInText}>
                <span className={styles.needHelp}>Need help?</span>
                <a className={styles.contactUs} href={CONTACT_US_URL} target="_blank" rel="noopener noreferrer">Talk to us</a>
              </div>
            </div>
          </div>
          <div className={styles.landingImg}>
            <img src={landingImg} alt="Landing page graphic"></img>
          </div>
        </div>
        <div className={styles.agencyContainer}>
          <h2 className={styles.agencyHeader}>Trusted by these agencies</h2>
          <div className={styles.agencies}>
            {trustedAgencies.map(agency => <img src={agency.img} alt={agency.alt} key={agency.img}/>)}
          </div>
        </div>
      </div>

      <div className={styles.whyUsePostman}>
        <div className={styles.innerContainer}>
          <h1>Why use Postman</h1>
          <div className={styles.reasons}>
            {reasons.map(reason =>
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
            )}
          </div>

          <div className={styles.lineBreak}></div>

          <div className={styles.testimonial}>
            <span className={cx(styles.openInvertedComma, styles.comma)}>&#8220;</span>
            <div className={styles.inner}>
              <img className={styles.desktopImg} src={userImg} alt="User"/>
              <div className={styles.textContainer}>
                <p className={styles.longText}>The email version is quite straightforward. Thumbs up!</p>
                <div className={styles.agencyRow}>
                  <span>User from MOE</span>
                </div>
              </div>
            </div>
            <span className={cx(styles.closeInvertedComma, styles.comma)}>&#8221;</span>
          </div>
        </div>
      </div>

      <div className={styles.faq}>
        <div className={styles.fixWidth}>
          <h1>Frequently asked questions</h1>
          <div className={styles.question}>
            <h3>What can Postman do?</h3>
            <p>Postman lets government officials mass send messages to citizens through SMS and email with minimal setup required through a user interface.</p>
          </div>

          <div className={styles.question}>
            <h3>What problem is Postman solving?</h3>
            <ol>
              <li><span>Communication is manual: </span>Agency users are still calling and sending individual to citizens</li>
              <li><span>Existing tool is not meeting the needs of users: </span>Outlook does not support mass sending and it is often capped at 1000 emails.</li>
              <li><span>No official source of information: </span>Communications come in many different forms. Lacking a consistent channel puts agencies at risks of phishing attack.</li>
            </ol>
            {questions.map(question =>
              <div className={styles.question} key={question.text}>
                <h3>{question.text}</h3>
                <p>{question.answer}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.onboarding}>
        <div className={cx(styles.fixWidth, styles.innerContainer)}>
          <div className={styles.textContainer}>
            <h2>Start using Postman today</h2>
            <p>It is easy to get started with your gov.sg email account. For non gov.sg email users, please fill out the following form. We will review your request within 3 business days.</p>

            <div className={styles.buttonRow}>
              <PrimaryButton className={styles.getStartedButton} onClick={directToSignIn}>
                    Get started<img className={styles.arrowRight} src={arrowRight} alt="Right arrow"/>
              </PrimaryButton>
              <a href={CONTACT_US_URL}>Have a question?</a>
            </div>
          </div>
          <div className={styles.imageContainer}>
            <img className={styles.onboardingImg} src={onboardingImg} alt="Onboarding"/>
          </div>
        </div>
      </div>

      <div className={styles.bottomContainer}>
        <div className={cx(styles.innerContainer, styles.fixWidth)}>
          <div className={styles.navLinks}>
            <div className={styles.header}>
              <span className={styles.title}>Postman</span>
              <span className={styles.text}>Reach out to the citizens in minutes</span>
            </div>
            <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">User guide</a>
            <a href={CONTRIBUTE_URL} target="_blank" rel="noopener noreferrer">Contribute</a>
          </div>

          <div className={styles.builtBy}>
            <span>Built by</span>
            <img src={companyLogo} alt="logo"/>
          </div>
        </div>
        <div className={styles.lineBreak}></div>
        <div className={cx(styles.footer, styles.fixWidth)}>
          <div className={styles.links}>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href={TC_URL} target="_blank" rel="noopener noreferrer">Terms of use</a>
            <a href={REPORT_BUG_URL} target="_blank" rel="noopener noreferrer">Report Vulnerability</a>
          </div>
          <span>&copy; {getYear()} Open Government Products</span>
          <div className={styles.builtByMobile}>
            <span>Built by</span>
            <img src={companyLogo} alt="logo"/>
          </div>
        </div>
      </div>
    </>
  )
}

export default Landing
import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'
import cx from 'classnames'


import Login from './login'
import { GUIDE_URL, CONTACT_US_URL } from 'config'
import PrimaryButton from 'components/common/primary-button'
import Navbar from './nav-bar'
import { AuthContext } from 'contexts/auth.context'

import styles from './Landing.module.scss'
import landingImg from 'assets/img/landing.svg'
import appLogo from 'assets/img/brand/app-logo.svg'
import companyLogo from 'assets/img/brand/company-logo.svg'
import ogpLogo from 'assets/img/ogp-logo.svg'
import arrowRight from 'assets/img/landing/arrow-right.svg'
import mohAgencyImg from 'assets/img/landing/moh.png'
import moeAgencyImg from 'assets/img/landing/moe.png'
import momAgencyImg from 'assets/img/landing/mom.png'

import reliableImg from 'assets/img/landing/WhyUsePostman-1.svg'
import reattemptImg from 'assets/img/landing/WhyUsePostman-2.svg'
import trackImg from 'assets/img/landing/WhyUsePostman-3.svg'
import userImg from 'assets/img/landing/moe-circle.png'

import onboardingImg from 'assets/img/landing/Onboarding.svg'

import testVideo from 'assets/mp4/test.mp4'

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

  const questions = [
    { text: 'When does Postman send my message?', answer: 'Postman currently supports send NOW.' },
    { text: 'Where do messages go and how do I know that Postman delivered it successfully?', answer: 'Messages go to the recipients that you specified. Like Fedex, you can track your package. Postman tells you the number of failed deliveries and you can reattempt delivery.' },
    { text: 'Is Postman free?', answer: 'Sending an email is free. SMS & WhatsApp will be charged based on WhatsApp and Twilio SMS rates.' },
    { text: 'Is Postman secure?', answer: 'We recommend that you don’t put any sensitive information in the sms content. Some of our users generate a recipient specific unique link that opens up to a locked page. When in doubt, you should follow IM8’s guidelines on data classification.' },
  ]

  return (
    <>
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
                Sign in <img className={styles.arrowRight} src={arrowRight}/>
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
          <div className={styles.reason}>
            <video autoPlay loop muted>
              <source src={testVideo} type="video/mp4" />
            </video>
            <div className={styles.textContainer}>
              <h3>Multichannel</h3>
              <p>No more toggling between your Outlook and SMS portal. You can reach your recipient via SMS and email in the same product!</p>
              <h3>Personalized Message</h3>
              <p>Add in details that are useful for and specific to your recipient.</p>
            </div>
          </div>

          <div className={styles.reason} id={styles.mobileReverse}>
            <div className={styles.textContainer}>
              <h3>Send in bulk.</h3>
              <p>You don't have to BCC everyone and wait for Outlook to slowly send a batch of 1000 email. Sit back and let Postman do the work.</p>
              <h3>No more +65.</h3>
              <p>We took care of the country code so you don't have to enter +65 in your excel file. </p>
            </div>
            <img src={reattemptImg} alt="Reattempt delivery"/>
          </div>

          <div className={styles.reason}>
            <img src={trackImg} alt="Track engagement"/>
            <div className={styles.textContainer}>
              <h3>Forgot something?</h3>
              <p>We all have those days where we miss out on an important point for official messages. With Postman, it's never too late to pause the campaign if you are sending > 1000 messages.</p>
              <h3>See past campaigns easily</h3>
              <p>Not sure what was sent out previously? Check Postman's campaign landing page for stats. Understand how you are communicating with your recipients.</p>
            </div>
          </div>

          <div className={styles.lineBreak}></div>

          <div className={styles.testimonial}>
            <span className={cx(styles.openInvertedComma, styles.comma)}>&#8220;</span>
            <div className={styles.inner}>
              <img className={styles.desktopImg} src={userImg} alt="User"/>
              <div className={styles.textContainer}>
                <h3>Lorem ipsum dolor sit amet</h3>
                <p className={styles.longText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Tellus id interdum velit laoreet id donec ultrices. Amet cursus sit amet dictum sit amet justo donec enim. Mi proin sed libero enim. Aenean et tortor at risus viverra adipiscing at in. Lectus vestibulum mattis ullamcorper velit.</p>
                <div className={styles.agencyRow}>
                  <img src={userImg} alt="User"/>
                  <span>Lorem ipsum dolor, Agency A</span>
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
            <h2>No onboarding process nor any installation required.</h2>
            <p>Sign in with your government email, and send your messages in minutes. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>

            <div className={styles.buttonRow}>
              <PrimaryButton className={styles.getStartedButton} onClick={directToSignIn}>
                    Get started<img className={styles.arrowRight} src={arrowRight}/>
              </PrimaryButton>
              <a href={CONTACT_US_URL}>Have a question?</a>
            </div>
          </div>
          <img className={styles.onboardingImg} src={onboardingImg} alt="Onboarding"/>
        </div>
      </div>

      <div className={styles.bottomContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.navLinks}>
            <div className={styles.header}>
              <span className={styles.title}>Postman</span>
              <span className={styles.text}>Reach out to the citizens in minutes</span>
            </div>
            <a href={POSTMAN_GUIDE_URL} target="_blank" rel="noopener noreferrer">User guide</a>
            <a href={POSTMAN_CONTRIBUTE_URL} target="_blank" rel="noopener noreferrer">Contribute</a>
          </div>

          <div className={styles.builtBy}>
            <span>Built by</span>
            <img src={ogpLogo} alt="logo"/>
          </div>
        </div>
        <div className={styles.lineBreak}></div>
        <div className={styles.footer}>
          <div className={styles.links}>
            <a href="" target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href="" target="_blank" rel="noopener noreferrer">Terms of use</a>
            <a href="" target="_blank" rel="noopener noreferrer">Report Vulnerability</a>
          </div>
          <span>&copy; 2019 Open Government Products. Last Updated 28 April 2020</span>
        </div>
      </div>
    </>
  )
}

export default Landing
import { createRef, useEffect, useContext } from 'react'

import { Redirect } from 'react-router-dom'

import styles from './Login.module.scss'

import LoginInput from './login-input'

import appLogo from 'assets/img/brand/app-logo.svg'
import loginImg from 'assets/img/landing/login.png'
import { InfoBanner } from 'components/common'
import Footer from 'components/common/footer'
import { AuthContext } from 'contexts/auth.context'

const Login = () => {
  const authContext = useContext(AuthContext)
  const infoBannerRef = createRef<HTMLDivElement>()

  useEffect(() => {
    function recalculateBannerPos() {
      const scrollTop = (document.documentElement.scrollTop ||
        document.body.scrollTop) as number
      if (infoBannerRef.current) {
        const infoBannerHeight = infoBannerRef.current?.offsetHeight as number
        if (scrollTop > infoBannerHeight) {
          infoBannerRef.current.style.position = 'fixed'
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

  if (authContext.isAuthenticated) {
    return <Redirect to="/campaigns"></Redirect>
  }

  return (
    <>
      <InfoBanner innerRef={infoBannerRef} />
      <div className={styles.topContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <img
              className={styles.appLogo}
              src={appLogo}
              alt="Postman logo"
            ></img>
            <LoginInput></LoginInput>
          </div>
          <div className={styles.landingImg}>
            <img src={loginImg} alt="Landing page graphic"></img>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default Login

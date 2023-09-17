import React, { useContext, useEffect, useState } from 'react'

import styles from './LoginCallback.module.scss'

import RightChevron from 'assets/img/chevron-right.svg'
import { AuthContext } from 'contexts/auth.context'

import {
  SgidUserProfile,
  getUser,
  loginWithSgid,
  selectSgidProfile,
  setUserAnalytics,
} from 'services/auth.service'

import { sendException } from 'services/ga.service'

const DASHBOARD_PAGE = '/'
const LOGIN_PAGE = '/login'

const LoginCallback = () => {
  const {
    setAuthenticated,
    setEmail: setAuthContextEmail,
    setExperimentalData,
  } = useContext(AuthContext)

  const [profiles, setProfiles] = useState<SgidUserProfile[]>([])
  const params = new URL(window.location.href).searchParams
  const code = params.get('code')

  const confirmSgidProfile = async (selectedProfile: string) => {
    try {
      await selectSgidProfile(selectedProfile)
      setAuthenticated(true)
      const user = await getUser()
      if (!user) {
        throw new Error('Unable to fetch user data!')
      }
      setAuthContextEmail(user.email)
      setExperimentalData(
        user?.experimental_data as {
          [feature: string]: Record<string, string>
        }
      )
      setUserAnalytics(user)
      window.location.replace(DASHBOARD_PAGE)
    } catch (e) {
      console.error(e)
      sendException((e as Error).message)
      window.location.replace(LOGIN_PAGE + `?errorCode=SingpassError`)
    }
  }

  const profileSelection = (
    <>
      <div className={styles.mainBlock}>
        <h3>Choose an account to continue to Postman</h3>
      </div>
      {profiles.map((profile) => (
        <div
          className={styles.profileBlock}
          key={profile.workEmail}
          onClick={() => confirmSgidProfile(profile.workEmail)}
        >
          <div>
            <div className={styles.profileMainText}>{profile.workEmail}</div>
            {!!profile.agencyName && (
              <div className={styles.profileSubText}>
                {profile.agencyName}
                {!!profile.departmentName && `, ${profile.departmentName}`}
              </div>
            )}
            <div className={styles.profileSubText}>
              {!!profile.employmentTitle && profile.employmentTitle}
            </div>
          </div>
          <img src={RightChevron} alt="Select profile" />
        </div>
      ))}
      <a href="/login" className={styles.bottomBlock}>
        Or, log in manually using email and OTP
      </a>
    </>
  )

  useEffect(() => {
    async function login(code: string) {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { userProfiles } = await loginWithSgid(code)
        if (!userProfiles || userProfiles.length == 0) {
          setProfiles([])
          window.location.replace(LOGIN_PAGE + `?errorCode=NoSingpassProfile`)
        } else {
          setProfiles(userProfiles)
        }
      } catch (e) {
        console.error(e)
        sendException((e as Error).message)
        window.location.replace(LOGIN_PAGE + `?errorCode=SingpassError`)
      }
    }

    void login(code ?? '')
  }, [code, setAuthContextEmail, setAuthenticated, setExperimentalData])

  return (
    <React.Fragment>
      {profiles.length === 0 && (
        <i className="spinner bx bx-loader-alt bx-spin"></i>
      )}
      {profiles.length > 0 && profileSelection}
    </React.Fragment>
  )
}

export default LoginCallback

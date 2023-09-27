import LoginTemplate from './LoginTemplate'

import LoginCallback from './login-callback'

const Callback = () => {
  return (
    <LoginTemplate displayFullLandingPage={false} displayAppLogo={false}>
      <LoginCallback />
    </LoginTemplate>
  )
}

export { Callback }

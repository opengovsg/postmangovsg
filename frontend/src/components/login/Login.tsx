import LoginTemplate from './LoginTemplate'

import LoginInput from './login-input'

import ModalContextProvider from 'contexts/modal.context'

const Login = () => {
  return (
    <ModalContextProvider>
      <LoginTemplate>
        <LoginInput></LoginInput>
      </LoginTemplate>
    </ModalContextProvider>
  )
}

export default Login

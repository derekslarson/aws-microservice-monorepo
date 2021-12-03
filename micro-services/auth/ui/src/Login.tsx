import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaArrowLeft, FaTimes, FaCheck } from 'react-icons/fa'

import Input from './components/Input'
import Button from './components/Button'
import Loader from './components/Loader'

import './Login.scss'
import useCookieSession from './hooks/useCookieSession'
const PHONE_REG_EXP = /\+?(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/

interface ILoginProps { }

const variants = {
  entrance: (step: number) => {
    return {
      opacity: 0,
      x: 200 * (step > 0 ? 1 : -1)
    }
  },
  animate: {
    opacity: 1,
    x: 0
  },
  exit: (step: number) => {
    return {
      opacity: 0,
      x: 200 * (step > 0 ? -1 : 1)
    }
  }
}

const CONFIG: IEnvConfig = {
  BASE_URL: new URL(`https://${process.env.REACT_APP_ENVIRONMENT}.yacchat.com/auth`),
  SIGN_IN_PATH: "/login",
  SIGN_IN_EXTERNAL_PROVIDER_PATH: "/login/idp",
  SIGN_UP_PATH: "sign-up",
  AUTHENTICATE_PATH: "/confirm",
  OAUTH2_AUTHORIZE_PATH: "/oauth2/authorize"
}
function useQuery() {
  const params = new URLSearchParams(window.location.search) as any
  return {
    client_id: params.get('client_id'),
    redirect_uri: params.get('redirect_uri'),
    response_type: params.get('response_type'),
    state: params.get('state'),
    code_challenge: params.get('code_challenge'),
    code_challenge_method: params.get('code_challenge_method'),
    scope: params.get('scope')
  }
}

const Login: React.FC<ILoginProps> = () => {
  const query = useQuery()
  const [otp, setOtp] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [step, setStep] = useState<number>(0)
  const [request, setRequest] = useState<IRequest>({
    status: 'STALE',
    data: {}
  })
  const [toaster, setToaster] = useState<IToaster>({
    type: null,
    show: false,
    message: ''
  })
  const [loader, setLoader] = useState<ILoader>({ show: false })
  const cookieSession = useCookieSession()

  const sendOtp = async (notifyOnDone?: boolean) => {
    if (!email) {
      setRequest({
        status: 'ERROR',
        data: {
          message: "Email field can't be blank"
        }
      })

      return
    }
    setRequest((state) => ({ ...state, status: 'LOADING' }))

    try {
      let phone
      const isPhoneNumber = PHONE_REG_EXP.test(email)
      if (isPhoneNumber) {
        phone = /\+\d/.test(email) ? email : `+1${email}`
      }
      const url = new URL([CONFIG.BASE_URL.pathname, CONFIG.SIGN_IN_PATH].join(""), CONFIG.BASE_URL.origin);
      const res: Response = await fetch(
        url.toString(),
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify(phone ? { phone } : { email })
        }
      ).catch((e) => e.response)
        const json = await res.json();
      if (res.ok) {
        setRequest({
          status: 'DONE',
          data: json
        })
        if (notifyOnDone) {
          setToaster({
            type: 'SUCCESS',
            message: 'New code was sent!',
            show: true
          })
        }
        setStep(1)
      } else {
        setStep(0)
        setRequest({
          status: 'ERROR',
          data: {
            message:
              res.status === 400
                ? 'Invalid email format'
                : res.statusText
          }
        })
      }
    } catch (e) {
      console.error(e)
      setStep(0)
      setRequest({
        status: 'ERROR',
        data: e.data
      })
    }
  }

  const authenticate = async (
    data: IManualAuthenticate | ITokenAuthenticate
  ) => {
    setRequest((state) => ({ ...state, status: 'LOADING' }))
    try {
      const url = new URL([CONFIG.BASE_URL.pathname, CONFIG.AUTHENTICATE_PATH].join("/"), CONFIG.BASE_URL.origin);
      const res: Response = await fetch(
          url.toString(),
          {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ confirmationCode: otp })
          }
        )
        .catch((err) => {
          throw err.response
        })
        const json: IAuthenticateResponse = await res.json();
      if (res.ok) {
        setRequest({
          status: 'DONE',
          data: json
        })
        setLoader({
          show: true,
          extra: (
            <>
              Redirecting you to{' '}
              <a style={{ color: 'black' }} href={query.redirect_uri}>
                {query.redirect_uri}
              </a>
            </>
          )
        })
        const redirect_uri = query.redirect_uri.replace(/\/$/, '')
        setTimeout(() =>
          window.location.replace(
            `${redirect_uri}?code=${json.authorizationCode}&state=${query.state}`
          )
        )
      }
    } catch (e) {
      setStep(1)
      setRequest({
        status: 'ERROR',
        data: e?.data || 'Failed to signin, please try again.'
      })
      throw new Error('request failed')
    }
  }

  const authenticateWithEmail = async () => {
    if (!otp) {
      setRequest({
        status: 'ERROR',
        data: {
          message: "Code field can't be blank"
        }
      })

      return
    }
    if (email) {
      const isPhoneNumber = PHONE_REG_EXP.test(email)
      if (isPhoneNumber) {
        const phone = /\+\d/.test(email) ? email : `+1${email}`
        await authenticate({ phone, otp })
      } else {
        await authenticate({ email, otp })
      }
    }
  }

  const authenticateWithCookie = async () => {
    if (!cookieSession) {
      setRequest({
        status: 'STALE',
        data: {}
      })
      return
    }
    try {
      setLoader({
        show: true,
        extra: <>Checking your session</>
      })
      await authenticate({ token: cookieSession })
    } catch (_) {
      // most probably session is not valid
      setLoader({
        show: false
      })
      setStep(0)
    }
  }

  const redirectToExternalProviderAuth = (externalProvider: "slack" | "google") => {    
    let redirectLocation = `${CONFIG.BASE_URL.toString()}${CONFIG.SIGN_IN_EXTERNAL_PROVIDER_PATH}?external_provider=${externalProvider}`;

    window.location.href = redirectLocation
  }


  const email_form = () => (
    <motion.form
      key={'email_form'}
      className={'login__wrapper'}
      variants={variants}
      initial={variants.entrance(step)}
      animate={'animate'}
      transition={{ ease: 'easeIn', duration: 0.1 }}
      exit={'exit'}
    >
      <h2>Sign in</h2>
      <button type="button" className="login-with-google-btn" onClick={() => redirectToExternalProviderAuth("google")}>
        Sign in with Google
      </button>
      <button type="button" className="login-with-slack-btn" onClick={() => redirectToExternalProviderAuth("slack")}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.8 122.8">
          <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a" />
          <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0" />
          <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d" />
          <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e" />
        </svg>
          Sign in with Slack
      </button>
      <span>or</span>
      <span className={'login__form-description'}>
        use your email address or phone number
      </span>
      <Input
        name={'email'}
        value={email}
        onChange={setEmail}
        type={'text'}
        placeholder={'Email or Phone Number'}
      />
      <Button
        loading={request.status === 'LOADING'}
        type={'submit'}
        label={'Continue'}
        onClick={() => sendOtp()}
        className={'login__button'}
      />
    </motion.form>
  )

  const otp_form = () => (
    <motion.form
      key={'otp_form'}
      className={'login__wrapper'}
      variants={variants}
      initial={variants.entrance(step)}
      animate={'animate'}
      transition={{ ease: 'easeIn', duration: 0.1 }}
      exit={'exit'}
    >
      <h2>Sign in</h2>
      <span className={'login__form-description'}>
        We sent a 6 digit code to{' '}
        <strong>
          {PHONE_REG_EXP.test(email) && !/\+\d/.test(email)
            ? `+1${email}`
            : email.toLowerCase()}
        </strong>
        . Enter it below to confirm your{' '}
        {/\+?([^A-Za-z]\d)+/g.test(email) ? 'phone number' : 'email address'}.
      </span>
      <Input
        name={'otp'}
        value={otp}
        onChange={setOtp}
        type={'otp'}
        className={'login__otp-input'}
      />
      <Button
        loading={request.status === 'LOADING'}
        type={'submit'}
        label={'Sign in'}
        onClick={authenticateWithEmail}
        className={'login__button'}
      />
      <span>
        Didn’t receive an email?{' '}
        <i onClick={() => sendOtp(true)}>Send it again.</i>
      </span>
    </motion.form>
  )

  useEffect(() => {
    if (toaster.show)
      setTimeout(
        () => setToaster({ show: false, type: null, message: '' }),
        5000
      )
    if (request.status === 'ERROR' && !toaster.show) {
      setToaster({
        show: true,
        message: request?.data?.message?.message || request?.data?.message,
        type: 'ERROR'
      })
      setRequest({ status: 'STALE', data: {} })
    }
  }, [request, toaster])

  useEffect(() => {
    if (cookieSession) {
      authenticateWithCookie()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cookieSession])

  return (
    <div className={'login'}>
      {loader?.show && <Loader fullscreen>{loader.extra}</Loader>}
      <motion.div
        className={'login__nav'}
        animate={step > 0 ? { y: 0 } : { y: 200 }}
        onClick={() => setStep((step) => step - 1)}
      >
        <div>
          <FaArrowLeft />
          Go Back
        </div>
      </motion.div>
      <div className="login__form">
        <AnimatePresence exitBeforeEnter custom={step}>
          {step === 0 ? email_form() : otp_form()}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toaster.show && (
          <motion.div
            className={`login__toaster ${toaster.type === 'ERROR' ? 'login__toaster--error' : ''
              } ${toaster.type === 'SUCCESS' ? 'login__toaster--success' : ''}`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            transition={{ ease: 'easeOut', duration: 0.2 }}
          >
            {toaster.type === 'ERROR' ? (
              <FaTimes />
            ) : toaster.type === 'SUCCESS' ? (
              <FaCheck />
            ) : null}
            {toaster.message || 'Network Error'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface IManualAuthenticate { phone?: string; email?: string; otp: string };
interface ITokenAuthenticate { token: string };
interface IAuthenticateResponse {
  authorizationCode: string
}

interface IRequest {
  status: 'DONE' | 'LOADING' | 'ERROR' | 'STALE'
  data: Record<any, any>
}

interface IToaster {
  type: 'ERROR' | 'SUCCESS' | null
  message: string
  show: boolean
}

interface ILoader {
  show: boolean
  extra?: React.ReactElement
}

interface IEnvConfig {
  BASE_URL: URL,
  SIGN_IN_PATH: string,
  SIGN_IN_EXTERNAL_PROVIDER_PATH: string,
  SIGN_UP_PATH: string,
  AUTHENTICATE_PATH: string,
  OAUTH2_AUTHORIZE_PATH: string
}

export default Login

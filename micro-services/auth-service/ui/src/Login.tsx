import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaArrowLeft, FaTimes, FaCheck } from 'react-icons/fa'

import Input from './components/Input'
import Button from './components/Button'
import Loader from './components/Loader'

import './Login.scss'
import useCookieSession from './hooks/useCookieSession'

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
  BASE_URL: new URL(`https://${process.env.REACT_APP_ENVIRONMENT}.yacchat.com/auth-service`),
  SIGN_IN_PATH: "/login",
  SIGN_UP_PATH: "sign-up",
  AUTHENTICATE_PATH: "/confirm",
}
function useQuery() {
  const params = new URLSearchParams(window.location.search) as any
  return {
    client_id: params.get('client_id'),
    redirect_uri: params.get('redirect_uri'),
    state: params.get('state')
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
      const isPhoneNumber = /\+?([^A-Za-z]\d)+/g.test(email)
      if (isPhoneNumber) {
        phone = /\+\d/.test(email) ? email : `+1${email}`
      }
      const url = new URL([CONFIG.BASE_URL.pathname, CONFIG.SIGN_IN_PATH].join(""), CONFIG.BASE_URL.origin);
      const res: Response = await fetch(
        url.toString(),
        {
          method: "POST",
          body: JSON.stringify(phone
            ? { 
              phone
            }
            : {
              email
            })
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
          url.toString() + `?client_id=${query.client_id}&redirect_uri=${query.redirect_uri}`,
          {
            method: "POST",
            credentials: "include",
            body: JSON.stringify((data as IManualAuthenticate).email ? {
              confirmationCode: otp,
              email: (data as IManualAuthenticate).email,
              phone: (data as IManualAuthenticate).phone,
              clientId: query.client_id,
              redirectUri: query.redirect_uri,
              session: request.data.session
            } : {
              session: (data as ITokenAuthenticate).token,
              clientId: query.client_id,
              redirectUri: query.redirect_uri,
            })
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
      const isPhoneNumber = /\+?([^A-Za-z]\d)+/g.test(email)
      if (isPhoneNumber) {
        const phone = /\+\d/.test(email) ? email : `+1${email}`
        await authenticate({ phone, otp })
      } else {
        await authenticate({ email, otp })
      }
    }
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
      <span className={'login__form-description'}>
        Use your Yac account email address or phone number
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
          {/\+?([^A-Za-z]\d)+/g.test(email) && !/\+\d/.test(email)
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
    
    if (cookieSession) {
      authenticateWithCookie()
    }
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

      <span
        style={{
          textAlign: 'center',
          maxWidth: '80%'
        }}
      >
        Don't have a Yac account.
        <a aria-label={'Go to Yac'} href={'https://app.yac.com/create'}>
          Click Here
        </a>
      </span>
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
  SIGN_UP_PATH: string,
  AUTHENTICATE_PATH: string,
}

export default Login

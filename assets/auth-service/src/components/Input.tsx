import React from 'react'
//@ts-ignore this component does not have TS support 😕
import OTPInput from 'react-otp-input'

import './Input.scss'

interface IInputComponentProps {
  type: string
  value: string
  name: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const Input: React.FC<IInputComponentProps> = ({
  type,
  value,
  placeholder,
  name,
  onChange,
  className
}) => {
  const renderBasedOnType = () => {
    switch (type) {
      case 'text':
        return (
          <input
            className={'login__input input ' + className}
            placeholder={placeholder || `Enter ${name}`}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
          />
        )
      case 'otp':
        return (
          <OTPInput
            inputStyle={'input input--otp ' + className}
            isInputNum
            shouldAutoFocus
            placeholder={placeholder || `Enter ${name}`}
            numInputs={6}
            value={value}
            onChange={onChange}
          />
        )
      default:
        return null
    }
  }

  return <>{renderBasedOnType()}</>
}

export default Input

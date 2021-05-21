import React, { useCallback, useMemo } from 'react'

import './Button.scss'
import Loader from './Loader'

interface IButtonProps {
  label: string
  loading?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const Button: React.FC<IButtonProps> = ({
  label,
  loading,
  className,
  onClick,
  type
}) => {
  const _onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      onClick(e)
    },
    [onClick]
  )
  return (
    <button
      type={type}
      className={`button button__wrapper ${className} ${
        loading ? ' button--disabled' : ''
      }`}
      onClick={_onClick}
    >
      {loading ? <Loader /> : label}
    </button>
  )
}

export default Button

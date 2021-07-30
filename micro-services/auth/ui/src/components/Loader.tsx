import React from 'react'

import './Loader.scss'

interface ILoaderProps {
  fullscreen?: boolean
}

const Loader: React.FC<ILoaderProps> = ({ children, fullscreen }) => {
  return (
    <div className={`loader ${fullscreen ? 'loader--full-screen' : ''}`}>
      <div className="lds-ellipsis">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div className="popup mx-auto text-black mt-8 text-lg font-serif">
        {children}
      </div>
    </div>
  )
}

export default Loader

import React from 'react'

import './IntegrationsProfile.scss'

interface IIntegrationProfileProps {
  name: string
  image: string
}

const IntegrationProfile: React.FC<IIntegrationProfileProps> = ({
  name,
  image
}) => {
  return (
    <div className={'integration integration__wrapper'}>
      <div className="integration__image">
        <img src={image} alt={`${name} logo`} />
      </div>
      <div className="integration__name">{name}</div>
    </div>
  )
}

export default IntegrationProfile

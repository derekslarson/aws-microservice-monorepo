import React from 'react'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'

import Login from './Login'

import { ReactComponent as Logo } from './assets/yac_logo.svg'
import './App.scss'

function App() {
  return (
    <div className="App">
      <div className="App__header">
        <Logo />
      </div>
      <Router>
        <Switch>
          <Route path={'/'} exact>
            <Login />
          </Route>
        </Switch>
      </Router>
    </div>
  )
}

export default App

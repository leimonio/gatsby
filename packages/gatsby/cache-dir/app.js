import React from "react"
import ReactDOM from "react-dom"
import domReady from "domready"

import socketIo from "./socketIo"
import emitter from "./emitter"
import { apiRunner, apiRunnerAsync } from "./api-runner-browser"
import { reportQueryErrorOverlay } from './error-overlay-handler'

window.___emitter = emitter

// Let the site/plugins run code very early.
apiRunnerAsync(`onClientEntry`).then(() => {
  // Hook up the client to socket.io on server
  const socket = socketIo()
  if (socket) {
    socket.on(`reload`, () => {
      window.location.reload()
    })
  }

  /**
   * Service Workers are persistent by nature. They stick around,
   * serving a cached version of the site if they aren't removed.
   * This is especially frustrating when you need to test the
   * production build on your local machine.
   *
   * Let's unregister the service workers in development, and tidy up a few errors.
   */
  if (supportsServiceWorkers(location, navigator)) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister()
      }
    })
  }

  const rootElement = document.getElementById(`___gatsby`)

  let Root = require(`./root`)
  if (Root.default) {
    Root = Root.default
  }

  const renderer = apiRunner(
    `replaceHydrateFunction`,
    undefined,
    ReactDOM.render
  )[0]

  domReady(() => {
    renderer(<Root />, rootElement, () => {
      apiRunner(`onInitialClientRender`)
    })
  })

  emitter.on(`pageQueryError`, (payload) => {
    const error = payload && payload.length ? payload[0].error : ``
    reportQueryErrorOverlay(error, {
      clearCondition: !payload.length,
      callback: () => console.error(new Error(error)),
    })
  })
})

function supportsServiceWorkers(location, navigator) {
  if (location.hostname === `localhost` || location.protocol === `https:`) {
    return `serviceWorker` in navigator
  }
  return false
}

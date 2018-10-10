import React, { createElement } from "react"
import { Router } from "@reach/router"
import { ScrollContext } from "gatsby-react-router-scroll"
import {
  shouldUpdateScroll,
  init as navigationInit,
  RouteUpdates,
} from "./navigation"
import { apiRunner } from "./api-runner-browser"
import syncRequires from "./sync-requires"
import pages from "./pages.json"
import loader from "./loader"
import JSONStore from "./json-store"
import EnsureResources from "./ensure-resources"

import { ERROR_TYPES, reportGenericErrorOverlay, clearErrorOverlay } from "./error-overlay-handler"

if (window.__webpack_hot_middleware_reporter__ !== undefined) {
  // Report build errors
  window.__webpack_hot_middleware_reporter__.useCustomOverlay({
    showProblems(type, obj) {
      const error = obj && obj.length ? obj[0] : ``
      reportGenericErrorOverlay(error, { clearCondition: type !== `errors` })
    },
    clear() {
      clearErrorOverlay(ERROR_TYPES.GENERIC)
    },
  })
}

navigationInit()

class RouteHandler extends React.Component {
  render() {
    let { location } = this.props

    // check if page exists - in dev pages are sync loaded, it's safe to use
    // loader.getPage
    let page = loader.getPage(location.pathname)

    if (page) {
      return (
        <EnsureResources location={location}>
          {locationAndPageResources => (
            <RouteUpdates location={location}>
              <ScrollContext
                location={location}
                shouldUpdateScroll={shouldUpdateScroll}
              >
                <JSONStore
                  pages={pages}
                  {...this.props}
                  {...locationAndPageResources}
                />
              </ScrollContext>
            </RouteUpdates>
          )}
        </EnsureResources>
      )
    } else {
      const dev404Page = pages.find(p => /^\/dev-404-page\/?$/.test(p.path))
      const custom404 = locationAndPageResources =>
        loader.getPage(`/404.html`) ? (
          <JSONStore
            pages={pages}
            {...this.props}
            {...locationAndPageResources}
          />
        ) : null

      return (
        <EnsureResources location={location}>
          {locationAndPageResources =>
            createElement(
              syncRequires.components[dev404Page.componentChunkName],
              {
                pages,
                custom404: custom404(locationAndPageResources),
                ...this.props,
              }
            )
          }
        </EnsureResources>
      )
    }
  }
}

const Root = () =>
  createElement(
    Router,
    {
      basepath: __PATH_PREFIX__,
    },
    createElement(RouteHandler, { path: `/*` })
  )

// Let site, plugins wrap the site e.g. for Redux.
const WrappedRoot = apiRunner(
  `wrapRootElement`,
  { element: <Root /> },
  <Root />,
  ({ result, plugin }) => {
    return { element: result }
  }
).pop()

export default () => WrappedRoot

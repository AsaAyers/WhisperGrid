/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import ReactDOM from "react-dom/client";
import { GridStorage } from "./client/GridStorage";
import { WhisperGridDemo } from "./WhisperGridDemo";
import { RouterProvider, createBrowserRouter, createHashRouter, useRouteError } from "react-router-dom";
import { CreateInvitation } from "./CreateInvitation";
import { ClientProvider } from "./ClientProvider";
import { InviteRoute } from "./DisplayInvite";
import { Alert, Flex } from "antd";
import { ReplyToInvite } from "./ReplyToInvite";
import { ThreadView } from "./ThreadView";
import { Logo } from "./Logo";
import { HomePage } from "./HomePage";
import { Settings } from "./Settings";
import { GridRouter } from "./GridRouter";


export class LocalGridStorage extends GridStorage {
  protected data = {
    get: (key: string) => {
      const str = localStorage.getItem(key)
      try {
        if (str) {
          return JSON.parse(str);
        }
      } catch (e) {
        // ignore parse errors
      }
      return str
    },
    set: (key: string, value: any) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    has: (key: string) => {
      const has = (null != localStorage.getItem(key))
      if (!has) {
        console.warn('localStorage!has', key, localStorage.getItem(key))
      }
      return has
    },

    delete: (key: string) => { (localStorage.removeItem(key)) },
  }

}

const basename = location.pathname.startsWith("/WhisperGrid")
  ? '/WhisperGrid'
  : undefined;

const selectedRouter = location.protocol === 'file:' ? createHashRouter : createBrowserRouter;

const router = selectedRouter([
  {
    path: '/logo.svg',
    element: <Logo />
  },
  {
    path: 'grid/:url',
    element: <GridRouter />
  },
  {
    path: "/",
    element: (
      <ClientProvider>
        <WhisperGridDemo />
      </ClientProvider>
    ),
    children: [
      {
        path: 'create',
        errorElement: <Error />,
        element: <CreateInvitation />
      },
      {
        path: '/settings',
        errorElement: <Error />,
        element: <Settings />
      },
      {
        path: 'invitation/:thumbprint',
        errorElement: <Error />,
        element: <InviteRoute />,
      },
      {
        path: 'thread/:thumbprint',
        errorElement: <Error />,
        element: <ThreadView />
      },
      {
        path: 'reply',
        errorElement: <Error />,
        element: <ReplyToInvite />
      },
      {
        path: '/',
        errorElement: <Error />,
        element: <HomePage />
      },
    ]
  },
], {
  basename,
});

// declare the optional window property cypress.CopyText
declare global {
  interface Window {
    cypressCopyText?: string;
  }
}


const root = ReactDOM.createRoot(
  document.getElementById("root")!
);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

function Error(): React.ReactNode {
  const error: any = useRouteError();
  console.log('error', error)
  const message = error?.data ?? error?.message ?? "An error occurred";
  return <Flex vertical align="center">
    <Alert
      message="Error"
      description={message}
      type="error"
      showIcon />
  </Flex>;
}

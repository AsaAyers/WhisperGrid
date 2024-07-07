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
  /**
   * This is only used for debugging, so real implementations don't need to
   * return data
   */
  getData = () => {
    return {}
  }
  hasItem: GridStorage["hasItem"] = (key) => {
    return Boolean(this.getItem(key) != null)
  }
  getItem: GridStorage["getItem"] = (key): any => {
    const str = localStorage.getItem(key)
    if (str) {
      try {
        return JSON.parse(str)
      } catch (e) {
        // ignore parse error
      }
    }
    return null
  };

  setItem: GridStorage["setItem"] = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value))
  };
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
    errorElement: <Error />,
    children: [
      {
        path: 'create',
        element: <CreateInvitation />
      },
      {
        path: '/settings',
        element: <Settings />
      },
      {
        path: 'invitation/:thumbprint',
        element: <InviteRoute />,
      },
      {
        path: 'thread/:thumbprint',
        element: <ThreadView />
      },
      {
        path: 'reply',
        element: <ReplyToInvite />
      },
      {
        path: '/',
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
  const message = error?.data ?? error?.message ?? "An error occurred";
  return <Flex vertical align="center">
    <Alert
      message="Error"
      description={message}
      type="error"
      showIcon />
  </Flex>;
}

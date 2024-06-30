/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import ReactDOM from "react-dom/client";
import { GridStorage } from "./index";
import { TestStorage } from "./client/GridStorage";
import { WhisperGridDemo } from "./WhisperGridDemo";
import { Navigate, RouterProvider, createBrowserRouter, createHashRouter, useSearchParams } from "react-router-dom";
import { CreateInvitation } from "./CreateInvitation";
import { ClientProvider, useClient } from "./ClientProvider";
import { InviteRoute } from "./DisplayInvite";
import { Alert, Flex, Typography } from "antd";
import { ReplyToInvite } from "./ReplyToInvite";
import { ThreadView } from "./ThreadView";

export class LocalGridStorage extends TestStorage {
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
    path: "/",
    element: (
      <ClientProvider>
        <WhisperGridDemo />
      </ClientProvider>
    ),
    errorElement: (
      <Flex vertical align="center">
        <Alert
          message="Not Found"
          description="404 Not Found"
          type="error"
          showIcon
        />
      </Flex>
    ),
    children: [
      {
        path: 'create',
        element: <CreateInvitation />
      },
      {
        path: 'invitation/:thumbprint',
        element: <InviteRoute />
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


function HomePage() {
  const client = useClient()
  const [searchParams] = useSearchParams()
  const path = searchParams.get('path')

  return (
    <Flex vertical>
      <h1>Whisper Grid</h1>
      {path && (

        <Navigate to={path}
          replace
          relative="path"
        />
      )}
      <Typography.Text
        copyable={{
          format: 'text/plain',
          onCopy() {
            window.cypressCopyText = client.thumbprint
          }
        }}
        code
      >
        {client.thumbprint}
      </Typography.Text>
      <Alert
        message="Warning"
        description="This is experimental and has not been evaluated for security. Do not use this for anything important."
        type="warning"
        showIcon
      />
      <p>
        Whisper Grid is a decentralized messaging system that uses a key stored
        in your browser to make sign and encrypt messages.
      </p>
    </Flex>
  )
}

const root = ReactDOM.createRoot(
  document.getElementById("root")!
);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)


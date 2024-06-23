/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import ReactDOM from "react-dom/client";
import { GridStorage } from "./index";
import { TestStorage } from "./client/GridStorage";
import { WhisperGridDemo } from "./WhisperGridDemo";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { CreateInvitation } from "./CreateInvitation";
import { ClientProvider } from "./ClientProvider";
import { InviteRoute } from "./DisplayInvite";
import { Alert, Flex } from "antd";
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

const router = createBrowserRouter([
  {
    path: "/",
    element: <WhisperGridDemo />,
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


function HomePage() {
  return (
    <Flex vertical>
      <h1>Whisper Grid</h1>
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
    <ClientProvider>
      <RouterProvider router={router} />
    </ClientProvider>
  </React.StrictMode>
)


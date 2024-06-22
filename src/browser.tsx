import React from "react";
import ReactDOM from "react-dom/client";
import { Client, GridStorage } from "./index";
import { TestStorage } from "./client/GridStorage";
import { Card, Checkbox } from "antd";
import { WhisperGridDemo } from "./WhisperGridDemo";

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

export const useLocalGridStorage = () => {
  const [storage] = React.useState(() => {
    return new LocalGridStorage()
  })
  const [client, setClient] = React.useState(null)
  const [thumbprint, setThumbprint] = React.useState(
    () => localStorage.getItem("thumbprint"))

  // Client.generateClient(storage, password)
  // Client.loadClient(storage, thumbprint, password)
  const setup = (password: string, thumbprint?: string) => {

  }

}


const root = ReactDOM.createRoot(
  document.getElementById("root")!
);

root.render(
  <React.StrictMode>
    <WhisperGridDemo />
  </React.StrictMode>
)


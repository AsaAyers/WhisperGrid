/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import ReactDOM from "react-dom/client";
import { GridStorage } from "./index";
import { TestStorage } from "./client/GridStorage";
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


const root = ReactDOM.createRoot(
  document.getElementById("root")!
);

root.render(
  <React.StrictMode>
    <WhisperGridDemo />
  </React.StrictMode>
)


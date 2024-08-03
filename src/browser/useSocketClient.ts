/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "../client";
import React from "react";

export type RemoteSetup = {
  isLoggedIn: false;
  login: (username: string, password: string) => Promise<boolean>;
};
export function useSocketClient(url: string): RemoteSetup | Client | null {
  const ws = React.useRef<WebSocket | null>(null);
  const [client, setClient] = React.useState<Client | RemoteSetup | null>(null);
  const [, forceUpdate] = React.useState(0);

  React.useEffect(() => {
    ws.current = new WebSocket(url);
    ws.current.onclose = () => {
      console.log("WebSocket connection closed");
      setClient(null);
    };
    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    const openRequests = new Map<string, (data: any) => void>();
    ws.current.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        // ignore parse errors
      }
      if (data && data.requestId) {
        const resolve = openRequests.get(data.requestId);
        if (resolve) {
          console.log("resolve", data);
          if (data.error) {
            resolve(Promise.reject(data.error));
          }
          resolve(data.result);
          openRequests.delete(data.requestId);
        } else if (data.requestId !== "init") {
          throw new Error("Missing requestId " + data.requestId);
        }
      }
    };

    new Promise((resolve) => {
      openRequests.set("init", resolve);
    }).then((isLoggedIn) => {
      const newClient = new Proxy<Client | RemoteSetup>(
        {
          isLocalClient: false,
          isLoggedIn,
        } as Client,
        {
          get(target, prop, receiver) {
            const fnValue = Client.prototype[prop as keyof Client];
            const isLogin =
              prop === "login" && !Reflect.get(target, "isLoggedIn", receiver);
            if (typeof fnValue === "function" || isLogin) {
              return (...args: any[]) =>
                new Promise((resolve) => {
                  const requestId = Math.random().toString(36).substring(7);
                  openRequests.set(requestId, resolve);
                  if (ws.current) {
                    ws.current.send(
                      JSON.stringify({ requestId, method: prop, args })
                    );
                  }
                }).then((r) => {
                  if (!isLoggedIn && prop === "login" && r) {
                    Reflect.set(target, "isLoggedIn", true);
                    setClient(newClient);
                    forceUpdate((n) => n + 1);
                  }
                  return r;
                });
            }

            return Reflect.get(target, prop, receiver);
          },
        }
      );
      setClient(newClient);
    });

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  return client;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "../client";
import React from "react";

export function useSocketClient(url: string): Client | null {
  const ws = React.useRef<WebSocket | null>(null);
  const [client, setClient] = React.useState<Client | null>(null);

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
        }
      }
    };

    new Promise((resolve) => {
      openRequests.set("init", resolve);
    }).then(() => {
      const newClient = new Proxy<Client>({} as Client, {
        get(target, prop, receiver) {
          const fnValue = Client.prototype[prop as keyof Client];
          console.log("get", prop, Client.prototype, typeof fnValue);
          if (typeof fnValue === "function") {
            return (...args: any[]) =>
              new Promise((resolve) => {
                const requestId = Math.random().toString(36).substring(7);
                openRequests.set(requestId, resolve);
                if (ws.current) {
                  ws.current.send(
                    JSON.stringify({ requestId, method: prop, args })
                  );
                }
              });
          }

          return Reflect.get(target, prop, receiver);
        },
      });
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

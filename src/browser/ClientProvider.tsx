/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Client, Thumbprint, BackupPayload } from "../client";
import { LocalGridStorage } from ".";
import { useNavigate } from "react-router-dom";
import { atom, useAtom } from "jotai";
import { invariant } from "./invariant";
import { useSocketClient } from "./useSocketClient";

export const clientAtom = atom(
  undefined as Client | undefined,
  (_get, set, newValue: Client | undefined) => {
    set(clientAtom, newValue)
  }
)

export function ClientProvider(props: React.PropsWithChildren) {
  const [client, setClient] = useAtom(clientAtom)
  const [clientUpdateKey, setClientUpdateKey] = React.useState(0);
  const navigate = useNavigate()

  const socketUrl = React.useMemo(() => {
    const url = new URL('/client-socket', window.location as any)
    url.protocol = 'wss:'
    return String(url)
  }, [])

  const socketClient = useSocketClient(socketUrl)
  React.useEffect(() => {
    if (socketClient) {
      setClient(socketClient)
    }
  }, [socketClient])

  React.useEffect(() => {
    if (client) {
      client.subscribe(() => {
        setClientUpdateKey((k) => k + 1 % 1000000);
      });
    }
  }, [])

  const logout = React.useCallback(() => {
    localStorage.removeItem("unprotected-password-for-testing")
    navigate('/')
    setClient(undefined)
  }, []);

  const generateClient = React.useCallback((password: string) => {
    const storage = new LocalGridStorage();
    return Client.generateClient(storage, password).then((c) => {
      setClient(c)
      return c
    });
  }, []);

  const loadClient = React.useCallback((thumbprint: string, password: string) => {
    const storage = new LocalGridStorage();
    return Client.loadClient(storage, thumbprint as Thumbprint<'ECDSA'>, password).then(
      (c) => {
        setClient(c)
        return c
      }
    );
  }, []);

  const loadFromBackup = React.useCallback((backup: BackupPayload, password: string) => {
    const storage = new LocalGridStorage();
    return Client.loadFromBackup(storage, backup, password).then((c) => {
      setClient(c)
      return c
    })
  }, [])


  const value = React.useMemo(() => {
    if (clientUpdateKey > -1) {
      // This hook needs to run any time this changes.
      // console.log({ clientUpdateKey })
    }
    return {
      loadFromBackup,
      generateClient,
      loadClient,
      logout,
      // Construct a new object on each update to make sure React hooks call
      // functions to get updates.
      client: client
    };
  }, [client, loadClient, generateClient, clientUpdateKey]);

  return (
    <clientContext.Provider value={value}>
      {props.children}
    </clientContext.Provider>
  );
}
const clientContext = React.createContext<null | {
  client?: Client;
  loadFromBackup: (backup: BackupPayload, password: string) => Promise<Client>
  generateClient: (password: string) => Promise<Client>
  loadClient: (thumbprint: string, password: string) => Promise<Client>
  logout: () => void
}>(null);

export const useClientSetup = () => {
  const value = React.useContext(clientContext);
  invariant(value, "useClient must be used within a ClientProvider");
  return value
}
export const useClient = () => {
  const value = useClientSetup();
  invariant(value.client, "ClientProvider must have a client")
  return value.client;
};


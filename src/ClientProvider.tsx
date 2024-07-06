import React from "react";
import { Client } from "./client";
import { invariant, Thumbprint } from "./client/utils";
import { LocalGridStorage } from "./browser";
import { useNavigate } from "react-router-dom";
import { BackupPayload } from "./client/types";


export function ClientProvider(props: React.PropsWithChildren) {
  const [client, setClient] = React.useState<undefined | Client>(undefined);
  const [clientUpdateKey, setClientUpdateKey] = React.useState(0);
  const navigate = useNavigate()

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
      client: client ? {
        thumbprint: client.thumbprint,
        createInvitation: client.createInvitation.bind(client),
        getInvitation: client.getInvitation.bind(client),
        appendThread: client.appendThread.bind(client),
        replyToInvitation: client.replyToInvitation.bind(client),
        getInvitations: client.getInvitations.bind(client),
        getThreads: client.getThreads.bind(client),
        makeBackup: client.makeBackup.bind(client),
        replyToThread: client.replyToThread.bind(client),
        getThreadInfo: client.getThreadInfo.bind(client),
        getEncryptedThread: client.getEncryptedThread.bind(client),
        decryptMessage: client.decryptMessage.bind(client),
      } : undefined,
    };
  }, [client, loadClient, generateClient, clientUpdateKey]);

  return (
    <clientContext.Provider value={value}>
      {props.children}
    </clientContext.Provider>
  );
}
const clientContext = React.createContext<null | {
  client?: Pick<Client,
    | 'thumbprint'
    | 'createInvitation'
    | 'getInvitation'
    | 'appendThread'
    | 'decryptMessage'
    | 'getInvitations'
    | 'getThreads'
    | 'getEncryptedThread'
    | 'getThreadInfo'
    | 'makeBackup'
    | 'replyToInvitation'
    | 'replyToThread'>;
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


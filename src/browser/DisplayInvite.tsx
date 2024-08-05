/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Button, Card, Descriptions, Flex, Form, Modal, Space, Typography, notification } from "antd";
import { Invitation, SignedInvitation, SignedReplyToInvite, SignedTransport, UnpackTaggedString } from "../client";
import { clientAtom, useClient } from "./ClientProvider";
import { Thumbprint, getJWKthumbprint, invariant, parseJWS, parseJWSSync, verifyJWS } from "../client/utils";
import { useHref, useLocation, useNavigate, useParams } from "react-router-dom";
import { EncryptedTextInput } from "./EncryptedTextInput";
import { NotificationInstance } from "antd/es/notification/interface";
import { useResolved } from "./useResolved";
import { atom, useAtom } from "jotai";

const getInviteId = async (signedInvite: SignedInvitation) => {
  invariant(await verifyJWS(signedInvite), 'Invalid JWS')
  const jws = parseJWSSync(signedInvite)

  return getJWKthumbprint(jws.payload.epk)
}

type DisplayInviteInfo = {
  inviteHash: string,
  signedInvitation?: SignedInvitation,
  expires?: number,
  unsubscribe: () => void,
  send: (message: SignedInvitation | SignedReplyToInvite) => Promise<void>
}

export const inviteHashAtom = (
  inviteAtom = atom(null as DisplayInviteInfo | null)
) => atom(
  (get) => get(inviteAtom),
  (get, set, thumbprint: Thumbprint<'ECDH'> | null,
    ntfy = 'ntfy.sh/'
  ) => {
    get(inviteAtom)?.unsubscribe()
    if (thumbprint) {
      const socket = new WebSocket(`wss://${ntfy}${thumbprint}/ws?since=0&sched=1`);
      async function onMessage(event: { data: string }) {
        const data = JSON.parse(event.data)
        if (data.message && await verifyJWS(data.message)) {
          const expires = data.expires
          const jws = parseJWSSync(data.message as SignedTransport)

          if (jws.header.sub === 'grid-invitation') {
            const message = data.message as SignedInvitation
            const id = await getInviteId(message)
            invariant(id === thumbprint,
              'Invalid JWS - hash mismatch'
            )
            set(inviteAtom, (v) => (v ? {
              ...v,
              signedInvitation: message,
              expires: Math.max(v.expires ?? 0, expires ?? 0)
            } : v))
          } else {
            const message = data.message as SignedReplyToInvite
            const jws = await parseJWS(message)
            invariant(jws.header.sub === 'reply-to-invite', 'Invalid JWS - Expected a reply to invite')
            invariant(jws.header.invite === thumbprint, 'Invalid JWS - hash mismatch')

            const client = get(clientAtom)
            invariant(client, 'Client is required')
            const invite = await client.getInvitation(thumbprint).catch(() => null)
            if (invite) {
              await client.appendThread(message).catch(() => { })
            }
          }
        }
      }
      socket.addEventListener('message', onMessage);
      const unsubscribe = () => {
        socket.removeEventListener('message', onMessage);
        socket.close();
      }
      const send = async (message: SignedInvitation | SignedReplyToInvite) => {
        invariant(await verifyJWS(message),
          'Invalid JWS - only self-signed allowed')
        const jws = await parseJWS(message)

        invariant(jws.header.sub === 'reply-to-invite' || jws.header.sub === 'grid-invitation',
          'Invalid JWS - Expected an invite or a reply to invite'
        )
        let headers = {}
        if (jws.header.sub === 'grid-invitation') {
          const hex = await getInviteId(message as SignedInvitation)
          invariant(hex === thumbprint, "Invalid JWS - hash mismatch")

          // Messages expire after 12 hours, but can be scheduled to be
          // delivered up to 3 days in the future.
          headers = { At: '3 days' }
        }

        const result = await fetch(`https://${ntfy}${thumbprint}`, {
          method: 'POST',
          body: message,
          headers,
        })

        if (jws.header.sub === 'grid-invitation') {
          const { expires } = await result.json()
          set(inviteAtom, (v) => (v ? {
            ...v,
            signedInvitation: message as SignedInvitation,
            expires,
          } : v))
        }
      }

      const value = { unsubscribe, send, inviteHash: thumbprint }
      set(inviteAtom, value)
    }
  }
)


function SharableLink({ signedInvite }: { signedInvite: SignedInvitation }) {
  const inviteAtom = React.useMemo(() => inviteHashAtom(), [])
  const [ntfyInvite, setInviteHash] = useAtom(inviteAtom)
  const inviteHash = ntfyInvite?.inviteHash
  const href = useHref({
    pathname: `/reply`,
    search: `?invite=${inviteHash}`
  }, {
    relative: 'route'
  })

  const url = React.useMemo(() => {
    return String(
      new URL(href, String(location))
    )
  }, [href, location])

  React.useEffect(() => {
    getInviteId(signedInvite).then((hex) => {
      setInviteHash(hex)
    });
  }, [signedInvite])

  if (!ntfyInvite) {
    return null
  }
  if (!ntfyInvite?.signedInvitation) {
    return (
      <Button onClick={() => ntfyInvite.send(signedInvite)}>
        Create Link
      </Button>
    )

  }
  const expires = (ntfyInvite?.expires ?? 0) * 1000
  const hours = Math.round((expires - Date.now()) / 1000 / 60 / 60)

  return <Flex vertical>
    <Typography.Paragraph copyable>{url}</Typography.Paragraph>
    <div>
      Expires: {new Date(expires).toLocaleString()}
    </div>
    <div>
      (About {hours} hours)
    </div>
    {hours < 48 && (
      <Button>
        Extend invite to 84 hours
      </Button>
    )}
  </Flex>
}

type Props = {
  invitation: Invitation;
  signedInvite: SignedInvitation;
};

export function InviteRoute() {
  const client = useClient()
  const { thumbprint } = useParams<{ thumbprint: Thumbprint<'ECDH'> }>()
  invariant(thumbprint, "Thumbprint is required")

  const [invitation, setInvitation] = React.useState<Invitation | null>(null)
  const signedInvite = useResolved(React.useMemo(() =>
    client.getInvitation(thumbprint), []
  ))

  React.useEffect(() => {
    if (signedInvite) {
      parseJWS(signedInvite).then((i) => setInvitation(i))
    }
  }, [signedInvite])


  if (invitation && signedInvite) {
    return <DisplayInvite invitation={invitation} signedInvite={signedInvite} />
  }

  return null
}

export function DisplayInvite({
  signedInvite, invitation,
}: Props): React.ReactNode {
  const label = React.useMemo(() => (
    `(${invitation.payload.nickname}) ${invitation.payload.note ?? ""}`
  ), [invitation])
  const [thumbprint, setThumbprint] = React.useState<Thumbprint | null>(null)
  React.useEffect(() => {
    getJWKthumbprint(invitation.payload.epk).then(setThumbprint)
  })

  return (
    <Space direction="vertical" size={16}>
      <Card>
        <Flex vertical align="center">
          <Typography.Title>
            Invitation {label}
          </Typography.Title>

          <Typography.Text>
            The block of text below is a signed invitation to join a thread.
            If you send it to someone else, they can use it to make a message to send back to you.
          </Typography.Text>


          <Descriptions title="Invitation details"
            layout="vertical"
            items={[
              {
                key: 'signed',
                label: 'Signed Invite', children:
                  <Boundary>
                    <CopyInvite signedInvite={signedInvite} />
                  </Boundary>
              },
              { label: 'Sharable Link', children: <SharableLink signedInvite={signedInvite} />, key: 'link' },
              { label: 'Public Key', children: thumbprint, key: '' },
              { label: 'Set My Nickname', children: invitation.payload.nickname, key: 'nickname' },
              { label: 'Note', children: invitation.payload.note, key: 'note' },
            ]} />
          <DecryptReply />
        </Flex>
      </Card>
    </Space>
  );
}

class Boundary extends React.Component<React.PropsWithChildren<object>> {
  state = { hasError: false, error: null as any | null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <Typography.Text type="danger">{this.state.error?.message}</Typography.Text>;
    }

    return this.props.children;
  }
}

export function CopyInvite({ signedInvite }: { signedInvite: SignedInvitation }): React.ReactNode {
  return <Typography.Paragraph code
    copyable={{
      format: 'text/plain',
      onCopy() {
        window.cypressCopyText = signedInvite;
      }
    }}
  >
    {signedInvite}
  </Typography.Paragraph>;
}


function DecryptReply() {
  const [showDecryptionModal, setShowDecryptionModal] = React.useState(false);

  const [notifications, contextHolder] = notification.useNotification()
  const navigate = useNavigate()
  const client = useClient()

  const onJWS = React.useCallback(async (jws: UnpackTaggedString<SignedTransport>, str: string) => {
    if (!await verifyJWS(str)) {
      return
    }
    switch (jws.header.sub) {
      case 'reply-to-invite':
        await client.appendThread(str as SignedReplyToInvite)
        navigate(`/thread/${jws.header.re}`)
        break;
      case 'grid-invitation':
        notification.error({
          message: "Grid Invitation",
          description: "This is an invitation, not a reply to this inviation"
        })
        break;
      case 'grid-reply':
        notification.error({
          message: "Grid Reply",
          description: "This is a reply, not a direct reply to this inviation"
        })
        break;
    }
  }, [])

  useUrlHash(onJWS, notifications);

  return (
    <>
      <Button type="primary" onClick={() => setShowDecryptionModal(true)}>
        Decrypt reply
      </Button>
      <Modal
        title="Decrypt reply"
        open={showDecryptionModal}
        onCancel={() => setShowDecryptionModal(false)}
        footer={[]}
      >
        <Typography.Title>
          Paste an encrypted reply below to decrypt it.
        </Typography.Title>
        <label htmlFor="encrypted_message">Encrypted Message</label>
        <Form>
          <EncryptedTextInput id="encrypted_message" onJWS={onJWS} />
        </Form>
      </Modal>
      {contextHolder}
    </>
  )
}

function useUrlHash(
  onJWS: (
    jws: UnpackTaggedString<SignedTransport>,
    str: string) => Promise<void>,
  notifications: NotificationInstance
) {
  const hash = useLocation().hash;
  React.useEffect(() => {
    async function validateHash() {
      if (hash) {
        const isValid = await verifyJWS(hash.substring(1));
        if (isValid) {
          const str = (hash.substring(1) as SignedTransport);
          const jws = parseJWSSync(str);
          await onJWS(jws, str);
        } else {
          notifications.warning({
            message: "Invalid hash",
            description: "The hash provided is not a valid signed reply. (The part of the URL after the #)"
          });
        }
      }
    }
    validateHash();
  }, [hash]);
}


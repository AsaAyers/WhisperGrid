/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Button, Card, Descriptions, Flex, Modal, Space, Typography, notification } from "antd";
import { Invitation, SignedInvitation, SignedReplyToInvite, SignedTransport, UnpackTaggedString } from "./client/types";
import { useClient } from "./ClientProvider";
import { useParams } from "react-router";
import { Thumbprint, getJWKthumbprint, invariant, parseJWS, parseJWSSync, verifyJWS } from "./client/utils";
import { useHref, useLocation, useNavigate } from "react-router-dom";
import { EncryptedTextInput } from "./EncryptedTextInput";
import { NotificationInstance } from "antd/es/notification/interface";

type Props = {
  invitation: Invitation;
  signedInvite: SignedInvitation;
};

export function InviteRoute() {
  const client = useClient()
  const { thumbprint } = useParams<{ thumbprint: Thumbprint<'ECDH'> }>()
  invariant(thumbprint, "Thumbprint is required")

  const [invitation, setInvitation] = React.useState<Invitation | null>(null)
  const signedInvite = React.useMemo(() =>
    client.getInvitation(thumbprint), []
  )

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
  const replyHref = useHref('/reply')

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
              { label: 'Public Key', children: thumbprint, key: '' },
              { label: 'Nickname', children: invitation.payload.nickname, key: 'nickname' },
              { label: 'Note', children: invitation.payload.note, key: 'note' },
              {
                label: "Grid protocol link", children: (
                  <Flex vertical>
                    <Typography.Link href={`web+grid:${replyHref}#${signedInvite}`}>
                      {`web+grid:${replyHref}#${signedInvite.substring(0, 10)}...`}
                    </Typography.Link>
                    <Typography.Paragraph>
                      A reply can be added to the hash portion of the URL to get
                      decoded automatically by its recipient.
                    </Typography.Paragraph>
                  </Flex>
                ), key: 'web+grid'
              }
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

function CopyInvite({ signedInvite }: { signedInvite: SignedInvitation }): React.ReactNode {
  return <Typography.Paragraph code
    copyable={{
      format: 'text/plain',
      onCopy() {
        window.cypressCopyText = signedInvite;
      }
    }}
    ellipsis={{
      expandable: true, rows: 3,
    }} style={{ maxWidth: '20rem' }}>
    {signedInvite}
  </Typography.Paragraph>;
}


function DecryptReply() {
  const [showDecryptionModal, setShowDecryptionModal] = React.useState(false);

  const [notifications, contextHolder] = notification.useNotification()
  const navigate = useNavigate()
  const client = useClient()

  const onJWS = React.useCallback(async (jws: UnpackTaggedString<SignedTransport>, str: string) => {
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
        <EncryptedTextInput id="encrypted_message" onJWS={onJWS} />
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


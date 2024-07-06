/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Button, Card, Descriptions, Flex, Form, Modal, Space, Typography, notification } from "antd";
import { Invitation, SignedInvitation, SignedReply } from "./client/types";
import TextArea from "antd/es/input/TextArea";
import { useClient } from "./ClientProvider";
import { useParams } from "react-router";
import { Thumbprint, getJWKthumbprint, invariant, parseJWS, verifyJWS } from "./client/utils";
import { useHref, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "antd/es/form/Form";

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
      parseJWS<Invitation>(signedInvite).then((i) => setInvitation(i))
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function DecryptReply() {
  type FieldType = {
    encrypted_message: SignedReply
  }
  const client = useClient()
  const [showDecryptionModal, setShowDecryptionModal] = React.useState(false);
  const navigate = useNavigate()
  const [form] = useForm<FieldType>()
  const encryptedMessage = Form.useWatch('encrypted_message', form)
  const [signedReply, setSignedReply] = React.useState<SignedReply | null>(null)
  const hash = useLocation().hash
  const [notifications, contextHolder] = notification.useNotification()

  React.useEffect(() => {
    async function validateHash() {
      if (hash) {
        console.log('hash', hash)
        const isValid = await verifyJWS(hash.substring(1))
        if (isValid) {
          setSignedReply(hash.substring(1) as SignedReply)
        } else {
          notifications.warning({
            message: "Invalid hash",
            description: "The hash provided is not a valid signed reply. (The part of the URL after the #)"
          })
        }
      }
    }
    validateHash()
  }, [hash])

  React.useEffect(() => {
    let cancel = false
    if (encryptedMessage) {
      delay(10).then(async () => {
        let isValid = false
        if (!cancel) {
          isValid = await verifyJWS(encryptedMessage)
        }
        if (!cancel && isValid) {
          setSignedReply(encryptedMessage)
        }
      }).catch(() => {
        // ignore errors
      })
    } if (signedReply) {
      delay(10).then(async () => {
        const result = await client.appendThread(signedReply)
        if (!cancel) {
          console.log({ result, cancel })
          navigate(`/thread/${result.threadId}`)
        }
      })
    }
    return () => {
      cancel = true
    }
  }, [encryptedMessage, signedReply])

  return (
    <>
      <Button type="primary" onClick={() => setShowDecryptionModal(true)}>
        Decrypt reply
      </Button>
      <Form
        form={form}
        onFinish={(values) => {
          console.log('onFinish', values)
          const reply = values.encrypted_message as SignedReply;
          return verifyJWS(reply)
            .then(() => client.appendThread(reply))
            .then((result) => {
              navigate(`/thread/${result.threadId}`)
            }).catch(() => {
              // ignore errors
            })

        }}
      >
        <Modal
          title="Decrypt reply"
          open={showDecryptionModal}
          footer={[]}
        >
          <Typography.Title>
            Paste an encrypted reply below to decrypt it.
          </Typography.Title>
          <Form.Item name="encrypted_message" label="Encrypted Message">
            <TextArea cols={600} rows={10} />
          </Form.Item>
        </Modal>
      </Form>
      {contextHolder}
    </>
  )
}
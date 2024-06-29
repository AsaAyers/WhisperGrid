import React from "react";
import { Button, Card, Descriptions, Flex, Form, Modal, Space, Typography } from "antd";
import { Invitation, SignedInvitation, SignedReply } from "./client/types";
import TextArea from "antd/es/input/TextArea";
import { useClient } from "./ClientProvider";
import { useParams } from "react-router";
import { Thumbprint, getJWKthumbprint, invariant, parseJWS, verifyJWS } from "./client/utils";
import { useNavigate } from "react-router-dom";
import { useForm } from "antd/es/form/Form";

type Props = {
  invitation: Invitation;
  signedInvite: SignedInvitation;
};

export function InviteRoute() {
  const client = useClient()
  const { thumbprint } = useParams()
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
                  <Typography.Paragraph code
                    copyable={{
                      format: 'text/plain',
                      onCopy() {
                        window.cypressCopyText = signedInvite
                      }
                    }}
                    ellipsis={{
                      expandable: true, rows: 3,
                    }} style={{ maxWidth: '20rem' }}>
                    {signedInvite}
                  </Typography.Paragraph>
              },
              { label: 'Public Key', children: thumbprint, key: '' },
              { label: 'Nickname', children: invitation.payload.nickname, key: 'nickname' },
              { label: 'Note', children: invitation.payload.note, key: 'note' },
            ]} />

          {invitation.payload.note && (
            <Typography.Text>
              The note is not encrypted: <Typography.Text code>{invitation.payload.note}</Typography.Text>
            </Typography.Text>
          )}
          <DecryptReply />
        </Flex>
      </Card>
    </Space>
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function DecryptReply() {
  const client = useClient()
  const [showDecryptionModal, setShowDecryptionModal] = React.useState(false);
  const navigate = useNavigate()
  const [form] = useForm()
  const encryptedMessage = Form.useWatch('encrypted_message', form)
  const [decryptedMessage, setDecryptedMessage] = React.useState<SignedReply | null>(null)

  React.useEffect(() => {
    let cancel = false
    if (encryptedMessage) {
      delay(10).then(async () => {
        if (!cancel) {
          verifyJWS(encryptedMessage)
        }
        if (!cancel) {
          console.log('decrypted')
          setDecryptedMessage(encryptedMessage)
        }
      }).catch(() => {
        // ignore errors
      })
    } if (decryptedMessage) {
      delay(10).then(async () => {
        const result = await client.appendThread(decryptedMessage)
        if (!cancel) {
          console.log({ result, cancel })
          navigate(`/thread/${result.threadThumbprint}`)
        }
      })
    }
    return () => {
      cancel = true
    }
  }, [encryptedMessage, decryptedMessage])

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
              navigate(`/thread/${result.threadThumbprint}`)
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
    </>
  )
}
import React from "react";
import { Anchor, Button, Card, Flex, List, Modal, Space, Typography } from "antd";
import { Invitation, SignedInvitation, SignedReply } from "./client/types";
import TextArea from "antd/es/input/TextArea";
import { useClient } from "./ClientProvider";
import { useParams } from "react-router";
import { invariant, parseJWS } from "./client/utils";
import { useNavigate } from "react-router-dom";

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

          <Typography.Text code copyable style={{ maxWidth: '20rem' }}>
            {signedInvite}
          </Typography.Text>
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


function DecryptReply() {
  const client = useClient()
  const [showDecryptionModal, setShowDecryptionModal] = React.useState(false);
  const navigate = useNavigate()


  return (
    <>
      <Button type="primary" onClick={() => setShowDecryptionModal(true)}>
        Decrypt reply
      </Button>
      <Modal
        title="Decrypt reply"
        open={showDecryptionModal}
      >
        <Typography.Title>
          Paste an encrypted reply below to decrypt it.
        </Typography.Title>

        <TextArea
          onChange={(e) => {
            client.appendThread(e.target.value as SignedReply)
              .then((result) => {
                navigate(`/thread/${result.threadThumbprint}`)
              }).catch(() => {
                // ignore errors
              })
          }}
          cols={600} rows={10} />
      </Modal>
    </>
  )
}
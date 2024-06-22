import React from "react";
import { Anchor, Card, Flex, Space, Typography } from "antd";
import { Invitation, SignedInvitation } from "./client/types";

type Props = {
  invitation: Invitation;
  signedInvite: SignedInvitation;
};

export function DisplayInvite({
  signedInvite, invitation
}: Props): React.ReactNode {

  const label = React.useMemo(() => (
    `(${invitation.payload.nickname}) ${invitation.payload.note}`
  ), [invitation])

  return <Space direction="vertical" size={16}>
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

        <Typography.Text>
          You can verify the signature and content of the invitation by pasting it into{" "}
          <Anchor.Link href="https://jwt.io" target="_blank" title="JSON Web Tokens">
            jwt.io
          </Anchor.Link>. It will match the output below:
        </Typography.Text>

        <Typography.Text code style={{ whiteSpace: 'pre' }}>
          {JSON.stringify(invitation, null, 2)}
        </Typography.Text>
      </Flex>
    </Card>
  </Space>;
}

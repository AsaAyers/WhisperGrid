import React from "react";
import { Avatar, Card, Flex, List, Typography } from "antd";
import { Client, DecryptedMessageType } from "./client";
import { UserOutlined } from "@ant-design/icons";
import { Thumbprint, invariant } from "./client/utils";
import { useParams } from "react-router-dom";
import { useClient } from "./ClientProvider";

export function ThreadView(): React.ReactNode {
  const client = useClient();
  const { thumbprint } = useParams<{ thumbprint: Thumbprint; }>();
  invariant(thumbprint, "Thumbprint is required");
  const thread = React.useMemo(() => {
    return client.getEncryptedThread(thumbprint);
  }, [thumbprint]);

  return (
    <Flex vertical gap="small" style={{ maxWidth: 600 }}>
      <List
        size="small"
        header={<Typography.Title>
          Thread {thumbprint}
        </Typography.Title>}
        bordered
        dataSource={thread ?? []}
        renderItem={(message) => (
          <MessageCard message={message}
            client={client} thumbprint={thumbprint} />
        )} />
    </Flex>
  );
}
function MessageCard({ message, client, thumbprint }: {
  message: string;
  client: Client;
  thumbprint: Thumbprint;
}): React.ReactNode {
  const [decryptedMessage, setDecryptedMessage] = React.useState<DecryptedMessageType | null>(null);
  const [showDecrypted, setShowDecrypted] = React.useState<boolean>(true);

  React.useEffect(() => {
    client.decryptMessage(thumbprint, message).then((decrypted) => {
      setDecryptedMessage(decrypted);
    });
  }, []);


  return (
    <Card actions={[
      <Typography.Link key="encrypted" onClick={() => setShowDecrypted((s) => !s)}>
        {showDecrypted && decryptedMessage ? 'Show' : 'Hide'} Encrypted
      </Typography.Link>
    ]}>
      <Avatar
        icon={<UserOutlined />}
        style={{ backgroundColor: '#87d068' }}
        size="small" />
      {decryptedMessage?.from}


      {showDecrypted && decryptedMessage ? (
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {decryptedMessage.message}
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph code copyable ellipsis={{
          expandable: true, rows: 3
        }}>
          {message}
        </Typography.Paragraph>
      )}
    </Card>);
}

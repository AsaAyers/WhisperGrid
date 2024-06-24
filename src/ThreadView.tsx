import React from "react";
import { Alert, Avatar, Button, Card, Flex, Form, FormProps, Input, List, Space, Typography } from "antd";
import { DecryptedMessageType } from "./client";
import { SendOutlined, UserOutlined } from "@ant-design/icons";
import { Thumbprint, invariant } from "./client/utils";
import { useParams } from "react-router-dom";
import { useClient } from "./ClientProvider";
import { SignedInvitation, SignedReply } from "./client/types";

const matchJWS = /^([a-zA-Z0-9-_]+)(\.[a-zA-Z0-9-_]+){2}$/;

export function ThreadView(): React.ReactNode {
  const [form] = Form.useForm()
  const client = useClient();
  const { thumbprint } = useParams<{ thumbprint: Thumbprint; }>();
  invariant(thumbprint, "Thumbprint is required");

  const [thread, setThread] = React.useState<Array<SignedInvitation | SignedReply>>([]);
  React.useEffect(() => {
    setThread(
      client.getEncryptedThread(thumbprint) ?? []
    )
  }, [thumbprint])

  type FieldType = {
    message: string;
  };

  const [newReply, setNewReply] = React.useState<SignedReply | null>(null);

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    let reply
    if (matchJWS.test(values.message)) {
      reply = await client.appendThread(values.message as SignedReply, thumbprint).catch(e => {
        console.error(e)
      })
    }
    if (!reply) {
      reply = await client.replyToThread(thumbprint, values.message, { selfSign: false }).catch(
        e => console.error(e)
      )
      if (reply) {
        setNewReply(reply)
      }
    }
    if (reply) {
      form.resetFields()
      setThread(
        client.getEncryptedThread(thumbprint) ?? []
      )
    }
  }

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
          <MessageCard
            message={message}
            thumbprint={thumbprint}
            onCopy={() => {
              if (message === newReply) {
                setNewReply(null)
              }
            }}
            decrypt={
              message !== newReply
            } />
        )} />

      {newReply && (
        <Alert message="Message encrypted, copy it from above" type="success" />
      )}


      <Card>
        <Form onFinish={onFinish} form={form} >
          <Form.Item<FieldType>
            name="message"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Space.Compact block>
              <Input defaultValue="" />
              <Button type="primary" htmlType="submit">
                <SendOutlined />
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>

      </Card>
    </Flex>
  );
}
export function MessageCard({ message, thumbprint, decrypt = true, onCopy }: {
  message: SignedInvitation | SignedReply
  thumbprint: Thumbprint;
  decrypt?: boolean
  onCopy?: () => void
}): React.ReactNode {
  const client = useClient()
  const [decryptedMessage, setDecryptedMessage] = React.useState<DecryptedMessageType | null>(null);
  const [showDecrypted, setShowDecrypted] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (decrypt) {
      client.decryptMessage(thumbprint, message).then((decrypted) => {
        setDecryptedMessage(decrypted);
      });
    }
  }, [decrypt, thumbprint, message]);


  return (
    <Card
      size="small"
      title={
        <>
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: '#87d068' }}
            size="small" />
          {decryptedMessage?.from}
        </>
      }
      extra={[
        <Typography.Link key="encrypted" onClick={() => setShowDecrypted((s) => !s)}>
          {showDecrypted && decryptedMessage ? 'Show' : 'Hide'} Encrypted
        </Typography.Link>
      ]}>


      {showDecrypted && decryptedMessage ? (
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {decryptedMessage.message}
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph
          code
          copyable={{
            onCopy: () => {
              console.log('copy')
              onCopy?.()
            }
          }}
          ellipsis={{
            expandable: true, rows: 3
          }}>
          {message}
        </Typography.Paragraph>
      )}
    </Card>);
}

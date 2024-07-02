import React, { useDeferredValue } from "react";
import { Alert, Avatar, Button, Card, Flex, Form, FormProps, Input, Popover, Space, Timeline, Typography } from "antd";
import { DecryptedMessageType } from "./client";
import { MessageOutlined, SendOutlined, ShareAltOutlined, UserOutlined } from "@ant-design/icons";
import { Thumbprint, invariant } from "./client/utils";
import { useParams } from "react-router-dom";
import { useClient } from "./ClientProvider";
import { SignedInvitation, SignedReply } from "./client/types";

const matchJWS = /^([a-zA-Z0-9-_]+)(\.[a-zA-Z0-9-_]+){2}$/;
const myColor = '#87d068';
const theirColor = '#108ee9';

type ThreadMessage = DecryptedMessageType & {
  original: SignedInvitation | SignedReply
}

export function ThreadView(): React.ReactNode {
  const [form] = Form.useForm()
  const client = useClient();
  const { thumbprint } = useParams<{ thumbprint: Thumbprint; }>();
  invariant(thumbprint, "Thumbprint is required");
  const [threadInfo, setThreadInfo] = React.useState<{
    myNickname: string,
    theirNickname: string,
  } | null>(null);

  const [thread, setThread] = React.useState<Array<ThreadMessage>>([]);
  React.useEffect(() => {
    const originalMessages = client.getEncryptedThread(thumbprint) ?? []
    let cancel = false

    const promises = Promise.all(originalMessages.map(async (original) => {
      invariant(!cancel, "Cancelled")
      const decrypted = await client.decryptMessage(thumbprint, original)
      return {
        ...decrypted,
        original
      }
    }))

    promises.then(async (decryptedMessages) => {
      const threadInfo = await client.getThreadInfo(thumbprint)
      if (!cancel) {
        setThreadInfo(threadInfo)
      }
      if (!cancel) {
        return setThread(decryptedMessages)
      }
    })

    return () => {
      cancel = true
    }
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
      const originalMessages = client.getEncryptedThread(thumbprint) ?? []
      const decrypted = await client.decryptMessage(thumbprint, originalMessages[originalMessages.length - 1])
      setThread((thread) => thread.concat({
        ...decrypted,
        original: reply
      }))
    }
  }

  return (
    <Flex vertical gap="small">
      <Timeline
        mode="left"
        items={thread.map((message) => ({
          dot: (
            <Popover title="Message Info"
              content={(
                <Flex vertical gap="small">
                  <Typography.Text>
                    From {message.fromThumbprint}
                  </Typography.Text>

                  <Typography.Paragraph
                    code
                    copyable={{
                      format: 'text/plain',
                      onCopy: () => {
                        window.cypressCopyText = message.original
                      }
                    }}
                    ellipsis={{
                      expandable: true, rows: 3
                    }}>
                    {message.original}
                  </Typography.Paragraph>
                </Flex>
              )}
            >
              {message.type === 'invite' ? <ShareAltOutlined style={{ fontSize: '16px' }} /> : <MessageOutlined style={{ fontSize: '16px' }} />}
            </Popover>
          ),
          label: `${message.from} ${new Date(message.iat).toLocaleString()}`,
          color: message.from === threadInfo?.myNickname ? myColor : theirColor,
          children: message.message,
        }))}
      />

      {newReply && (
        < >
          <Typography.Paragraph
            code
            copyable={{
              format: 'text/plain',
              onCopy: () => {
                window.cypressCopyText = newReply
                setNewReply(null)
              }
            }} >
            {newReply}
          </Typography.Paragraph>
          <Alert message="Message encrypted, copy it from above" type="success" />
        </>
      )}


      <Card>
        <Form onFinish={onFinish} form={form} >
          <Flex vertical gap="small">
            <Typography.Text>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: myColor }}
                size="small" />
              {threadInfo?.myNickname ?? ""}
            </Typography.Text>

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
          </Flex>
        </Form>

      </Card>
    </Flex >
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
            style={{ backgroundColor: myColor }}
            size="small" />
          {decryptedMessage?.from}
        </>
      }
      extra={[
        <Typography.Link key="encrypted" onClick={() => setShowDecrypted((s) => !s)}>
          {showDecrypted && decryptedMessage ? 'Show' : 'Hide'} Encrypted
        </Typography.Link>,
        <Typography.Link href={`web+grid:/thread/`} key="web+grid">
          web+grid
        </Typography.Link>
      ]}>


      {showDecrypted && decryptedMessage ? (
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {decryptedMessage.message}
        </Typography.Paragraph>
      ) : (
        <>
          <Typography.Paragraph
            code
            copyable={{
              format: 'text/plain',
              onCopy: () => {
                window.cypressCopyText = message
                onCopy?.()
              }
            }}
            ellipsis={{
              expandable: true, rows: 3
            }}>
            {message}
          </Typography.Paragraph>
        </>
      )}
    </Card>);
}

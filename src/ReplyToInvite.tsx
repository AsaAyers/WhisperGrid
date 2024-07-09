import React from "react";
import { Alert, Button, Card, Descriptions, Flex, Form, FormProps, Input, List, notification, Space, Typography } from "antd";
import { Thumbprint, getJWKthumbprint, invariant, parseJWS } from "./client/utils";
import { Invitation, SignedInvitation, SignedReply, SignedTransport, UnpackTaggedString } from "./client/types";
import { useClient } from "./ClientProvider";
import { SendOutlined } from "@ant-design/icons";
import { MessageCard } from "./ThreadView";
import { useLocation } from "react-router-dom";
import { ThreadID } from "./client/GridStorage";
import { EncryptedTextInput } from "./EncryptedTextInput";

export function ReplyToInvite(): React.ReactNode {
  const client = useClient();
  const [form] = Form.useForm<FieldType>();
  type FieldType = {
    nickname?: string;
    message?: string;
  };
  const location = useLocation();
  const hash = location.hash
  const [invitation, setInvitation] = React.useState<Invitation | null>(null);
  const [invitationString, setInvitationString] = React.useState<SignedInvitation | null>(
    () => hash ? hash.slice(1) as SignedInvitation : null
  );
  const [thumbprint, setThumbprint] = React.useState<Thumbprint | null>(null);
  const [threadId, setThreadId] = React.useState<ThreadID | null>(null);
  const [notifications, notificationContext] = notification.useNotification()

  React.useEffect(() => {
    if (invitation) {
      getJWKthumbprint(invitation.payload.epk).then(setThumbprint)
    }
  }, [invitation])

  const [reply, setReply] = React.useState<SignedReply | null>(null);
  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    invariant(invitationString, 'missing invitation')
    const reply = await client.replyToInvitation(invitationString, values.message!, values.nickname!);
    const r = await parseJWS(reply, null)
    setThreadId(r.header.re)
    setReply(reply);
  };

  const onJWS = React.useCallback((jws: UnpackTaggedString<SignedTransport>, str: string) => {
    switch (jws.header.sub) {
      case 'grid-invitation':
        // reaching through jws.header.sub doesn't seem to type-narrow jws
        setInvitation(jws as Invitation)
        setInvitationString(str as SignedInvitation)
        break;
      case 'grid-reply':
        notifications.error({
          message: "Unexpected Response",
          description: "This is a reply to a thread. Expected an invitation."
        })
        break;
      case 'reply-to-invite':
        notifications.error({
          message: "Unexpected Response",
          description: "This is a reply to an invitation. Expected an invitation."
        })
    }
  }, [])

  return (
    <>
      <Flex vertical gap="small" style={{ maxWidth: 600 }}>
        <List
          size="small"
          header={<Typography.Title>
            Reply to invitation
          </Typography.Title>}
          bordered
          dataSource={['invitation']}
          renderItem={() => (
            <Card
              size="small"
              title="Invitation"
            >
              <EncryptedTextInput onJWS={onJWS} />
              {invitation && (
                <Descriptions title="Invitation Data" layout="vertical" items={[
                  { label: 'Public Key', children: thumbprint, key: '' },
                  { label: 'Nickname', children: invitation.payload.nickname, key: 'nickname' },
                  { label: 'Note', children: invitation.payload.note, key: 'note' },
                ]} />
              )}
            </Card>

          )} />

        {reply && threadId && (
          <>
            <MessageCard message={reply} threadId={threadId} decrypt={false} />
            <Alert message="Message encrypted, copy it from above" type="success" />

            <Typography.Link
              ellipsis
              href={`web+grid:/invitation/${threadId}#${reply}`}
            >
              {`web+grid:/invitation/${threadId}#${reply}`}
            </Typography.Link>
          </>
        )}
        <Form
          form={form}
          name="reply-to-invite"
          disabled={reply != null}
          initialValues={{
          }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Card>
            <Form.Item<FieldType>
              label="Nickname"
              name="nickname"
              rules={[{ required: true, message: 'What nickname would like to use in your conversation?' }]}
            >
              <Input disabled={invitation == null || reply != null} />
            </Form.Item>
            <Form.Item<FieldType>
              name="message"
              label="Message"
              rules={[{ required: true }]}
            >
              <Space.Compact block>
                <Input defaultValue=""
                  disabled={invitation == null || reply != null} />
                <Button type="primary" htmlType="submit"
                  disabled={invitation == null || reply != null} >
                  <SendOutlined />
                </Button>
              </Space.Compact>
            </Form.Item>
          </Card>
        </Form>
      </Flex>
      {notificationContext}
    </>
  );
}

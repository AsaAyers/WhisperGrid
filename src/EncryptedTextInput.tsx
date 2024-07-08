/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Input, Form, notification } from "antd";
import { SignedReply, SignedTransport, UnpackTaggedString } from "./client/types";
import { parseJWS, parseJWSSync, verifyJWS } from "./client/utils";

export function EncryptedTextInput({ onJWS }: {
  onJWS: (jws: UnpackTaggedString<SignedTransport>, str: string) => void
}) {
  type FieldType = {
    encrypted_message: SignedReply
  }
  const [notifications, contextHolder] = notification.useNotification()
  const [form] = Form.useForm<FieldType>()

  return (
    <Form
      form={form}
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onChange={(_e: any) => {
        form.submit()
      }}
      onFinish={async (values) => {
        const jws = await parseJWS<SignedTransport>(values.encrypted_message, null)
        switch (jws.header.sub) {
          case 'reply-to-invite':
          case 'grid-invitation':
          case 'grid-reply':
            onJWS(jws, values.encrypted_message)
            break;
          default:
            notifications.error({
              message: "Unexpected Response",
              description: "This JWS does not appear to be a WhisperGrid message"
            })
        }
        form.setFieldValue('encrypted_message', JSON.stringify(jws, null, 2))
      }}
    >
      <Form.Item
        name="encrypted_message"
        rules={[
          {
            required: true,
            pattern: /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
            message: 'Unable to validate JWS. Expected a self-signed message',
            validator: async (rule, v) => {
              const value = v.trim()
              if (rule.pattern?.test(value)) {
                const isValid = await verifyJWS(value)
                if (isValid) {
                  try {
                    parseJWSSync(value)
                    return
                  } catch (e: any) {
                    // ignore parse errors
                  }
                }

              }
              return Promise.reject()
            }
          }
        ]}
      >
        <Input.TextArea cols={600} rows={10} />
      </Form.Item>
      {contextHolder}
    </Form>
  )
}
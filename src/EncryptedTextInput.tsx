/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { App, Input, Form } from "antd";
import { SignedReply, SignedTransport, UnpackTaggedString } from "./client/types";
import { invariant, parseJWS, parseJWSSync, verifyJWS } from "./client/utils";

const jwsRegex = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/

type FieldType = {
  encrypted_message: SignedReply
}
export function EncryptedTextInput({ id, label, onJWS, }: {
  id?: string
  label?: string,
  onJWS: (jws: UnpackTaggedString<SignedTransport>, str: string) => void
}) {
  const { notification } = App.useApp()
  const form = Form.useFormInstance<FieldType>()
  invariant(form, 'EncryptedTextInput needs to be rendered inside a Form')
  const value = Form.useWatch('encrypted_message')
  const fieldErrors = form.getFieldError('encrypted_message')

  React.useEffect(() => {
    if (fieldErrors.length === 0 && jwsRegex.test(value)) {
      const onFinish = async () => {
        const jws = await parseJWS<SignedTransport>(value, null).catch(() => null)
        switch (jws?.header.sub) {
          case 'reply-to-invite':
          case 'grid-invitation':
          case 'grid-reply':
            onJWS(jws, value)
            break;
          default:
            notification.error({
              message: "Unexpected Response",
              description: "This JWS does not appear to be a WhisperGrid message"
            })
        }
      }
      onFinish()
    }
  }, [fieldErrors, value])

  return (
    <Form.Item
      name="encrypted_message"
      id={id}
      label={label}
      rules={[
        {
          required: true,
          pattern: jwsRegex,
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
          },
        }
      ]}
    >
      <Input.TextArea cols={600} rows={10} />
    </Form.Item>
  )
}
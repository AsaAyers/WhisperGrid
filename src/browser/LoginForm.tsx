import React from "react";
import { Alert, Button, Flex, Form, FormProps, Input, Radio, Typography, Upload } from "antd";
import { useClientSetup } from "./ClientProvider";
import Link from "antd/es/typography/Link";
import { invariant, parseJWS, verifyJWS } from "../client/utils";
import { UploadOutlined } from "@ant-design/icons";
import { UploadChangeParam } from "antd/es/upload";
import { BackupPayload } from "../client/types";

const unsupportedBrowser = !window?.crypto?.subtle

type FieldType = {
  mode: 'open'
  password: string;
  thumbprint: string;
  backup?: never
} | {
  mode: 'create',
  password: string,
  confirmPassword: string,
  backup?: never
} | {
  mode: 'backup',
  password: string
  backup: UploadChangeParam
}

export function LoginForm() {
  const [form] = Form.useForm<FieldType>();
  const mode = Form.useWatch('mode', form);
  const backup = Form.useWatch('backup', form);
  const [backupPayload, setBackupPayload] = React.useState<BackupPayload | null>(null)

  React.useEffect(() => {
    async function readBackup() {
      if (backup) {
        const file = backup.fileList[0]
        const txt = await file.originFileObj!.text()
        const data = await parseJWS(txt)
        setBackupPayload(data.payload as BackupPayload)
      }
    }
    readBackup()
  }, [backup])

  const { generateClient, loadClient, loadFromBackup } = useClientSetup()

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    if (values.mode === 'create') {
      const client = await generateClient(values.password)
      localStorage.setItem("thumbprint", client.thumbprint)
    } else if (values.mode === 'open') {
      await loadClient(values.thumbprint, values.password)
    } else if (values.mode === 'backup') {
      invariant(backupPayload, "No backup file")
      const client = await loadFromBackup(backupPayload, values.password)
      localStorage.setItem("thumbprint", client.thumbprint)
    }
  };
  const initialValues = React.useMemo(() => {
    const thumbprint = localStorage.getItem("thumbprint")
    if (thumbprint) {
      return {
        mode: 'open',
        thumbprint,
      }
    }
    return {
      mode: 'create',
    }
  }, [])

  React.useEffect(() => {
    const password = localStorage.getItem("unprotected-password-for-testing")
    if (password) {
      const thumbprint = localStorage.getItem("thumbprint")
      if (thumbprint && password) {
        onFinish({
          mode: 'open',
          thumbprint,
          password,
        })
      }
    }
  }, [])


  return (
    <Flex
      vertical
      align="center"
      style={{
      }}
      gap="small">

      <Alert
        type="info"
        message={`Whisper grid is an experimental system for decentralized, end-to-end
encrypted messaging. This demo only stores data in your own browser (localStorage).
`.trim()}
      />
      <p>
      </p>
      <p>
        You can create a new identity, or unlock an existing one from a previous session.
      </p>

      <Form
        form={form}
        name="login"
        initialValues={initialValues}
        disabled={unsupportedBrowser}
        onFinish={onFinish}
        // onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Flex vertical align="center" gap="0.5em">

          <Form.Item<FieldType> name="mode" label="Radio">
            <Radio.Group>
              <Radio value="create">Create Identity</Radio>
              <Radio value="open">Open locally stored identity</Radio>
              <Radio value="backup">Open Backup</Radio>
            </Radio.Group>
          </Form.Item>

          {mode === 'open' && (
            <Form.Item<FieldType>
              label="Thumbprint"
              name="thumbprint"
              rules={[{ required: true, message: 'Please input the stored thrumbprint to unlock (id-...)' }]}
            >
              <Input />
            </Form.Item>
          )}

          {mode === 'backup' && (
            <Form.Item<FieldType>
              label="Backup File"
              name="backup"
              rules={[{ required: true }]}
            >
              <Upload.Dragger
                accept=".jws.txt"
                multiple={false}
                disabled={!!backupPayload}
                beforeUpload={async (file) => {
                  const signedBackup = (await file.text())
                  invariant(await verifyJWS(signedBackup), "Invalid backup file")
                  return false
                }}
              >
                <Button disabled={!!backupPayload} icon={<UploadOutlined />}>Click to Upload</Button>
              </Upload.Dragger>
            </Form.Item>
          )}
          {mode === 'backup' && backupPayload && (
            backupPayload.thumbprint
          )}

          <Form.Item<FieldType>
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              disabled={
                (mode === 'backup' && !backupPayload)
              }
            />
          </Form.Item>

          {mode === 'create' && (
            <Form.Item<FieldType>
              label="Confirm password"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                {
                  required: true,
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The new password that you entered do not match!'));
                  },
                }),
              ]}>
              <Input.Password />
            </Form.Item>
          )}

          {unsupportedBrowser && (
            <Alert
              message="Warning"
              description="This browser does not support the WebCrypto API, which is required for WhisperGrid to work."
              type="warning"
              showIcon />
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit">
              {mode === "create" ? "Create" : "Unlock"}
            </Button>
          </Form.Item>
        </Flex>
      </Form>

      <Typography.Text style={{ whiteSpace: 'nowrap' }}>
        An explanation of this project is available at:{' '}
        <Link href="https://gist.github.com/AsaAyers/2cce4de71d4e1eb972d3dc01715ab3a7" target="_blank">
          whispergrid.md
        </Link>
      </Typography.Text>
    </Flex >
  );
}

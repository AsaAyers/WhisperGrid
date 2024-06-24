import React from "react";
import { Alert, Button, Flex, Form, FormProps, Input, Radio } from "antd";
import { useClientSetup } from "./ClientProvider";

const unsupportedBrowser = !window?.crypto?.subtle

type FieldType = {
  mode: 'open'
  thumbprint: string;
  password: string;
} | {
  mode: 'create',
  password: string,
  confirmPassword: string,
}

export function LoginForm() {
  const [form] = Form.useForm<FieldType>();
  const mode = Form.useWatch('mode', form);

  const { generateClient, loadClient } = useClientSetup()

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    if (values.mode === 'create') {
      const client = await generateClient(values.password)
      localStorage.setItem("thumbprint", client.thumbprint)
    } else {
      await loadClient(values.thumbprint, values.password)
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
          password
        })
      }
    }
  }, [])


  return (
    <Flex
      vertical
      style={{
        padding: 24,
        margin: "auto",
        maxWidth: 800,
      }}
      gap="small">

      <p>
        Whisper grid is an experimental system for decentralized, end-to-end
        encrypted messaging. This demo only stores data in your own browser (localStorage).
      </p>
      <p>
        You can create a new identity, or unlock an existing one from a previous session.
      </p>

      <Form
        form={form}
        name="login"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        initialValues={initialValues}
        disabled={unsupportedBrowser}
        onFinish={onFinish}
        // onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item<FieldType> name="mode" label="Radio">
          <Radio.Group>
            <Radio value="create">Create Identity</Radio>
            <Radio value="open">Open locally stored identity</Radio>
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

        <Form.Item<FieldType>
          label="Password"
          name="password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password />
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

        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button type="primary" htmlType="submit">
            {mode === "create" ? "Create" : "Unlock"}
          </Button>
        </Form.Item>
      </Form>

      {unsupportedBrowser && (
        <Alert
          message="Warning"
          description="This browser does not support the WebCrypto API, which is required for WhisperGrid to work."
          type="warning"
          showIcon />
      )}
    </Flex >
  );
}

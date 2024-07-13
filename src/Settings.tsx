/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useClient, useClientSetup } from "./ClientProvider";
import { Button, Flex, Form, Input, Modal } from "antd";
import { invariant } from "./client/utils";
import { useHref } from "react-router-dom";

function Backup() {
  type FieldType = {
    password: string;
    confirmPassword: string;
    filename: string;
  };
  const [form] = Form.useForm<FieldType>();
  const [isBackupModalOpen, setIsBackupModalOpen] = React.useState(false);
  const client = useClient();
  const [processing, setProcessing] = React.useState(false);


  return (
    <>
      <Button
        type="default"
        onClick={() => {
          setIsBackupModalOpen(true);
        }}>
        Download password protected backup
      </Button>
      <Modal
        open={isBackupModalOpen}
        okButtonProps={{ htmlType: 'submit' }}
        confirmLoading={processing}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsBackupModalOpen(false);
          setProcessing(false);
          form.resetFields();
        }}>
        <Form
          disabled={processing}
          onFinish={async (values) => {
            invariant(values.password === values.confirmPassword, "Passwords do not match");
            setProcessing(true);

            const backup = await client.makeBackup(values.password);
            const blob = new Blob([backup], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = values.filename
            a.click();
            setIsBackupModalOpen(false);
          }}
          onKeyDown={(e) => {
            // Submit on enter
            if (e.key === 'Enter') {
              form.submit();
            }
          }}
          initialValues={{
            filename: `grid-${client.thumbprint}.jws.txt`,
          }}
          form={form}>
          <Form.Item<FieldType>
            label="Filename"
            name="filename"
            rules={[{ required: true, pattern: /\.jws\.txt$/, message: 'Invalid filename' }]}
          >
            <Input disabled={processing} />
          </Form.Item>
          <Form.Item<FieldType>
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password autoFocus disabled={processing} />
          </Form.Item>

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
            <Input.Password disabled={processing} />
          </Form.Item>
        </Form>
      </Modal >
    </>
  );
}

function DeleteAll() {
  const [modals, modalContext] = Modal.useModal();
  const { logout } = useClientSetup()


  return (
    <>
      <Button
        type="default"
        onClick={() => {
          modals.confirm({
            title: 'Delete all data',
            content: 'Are you sure you want to delete all data? This action cannot be undone.',
            onOk: async () => {
              localStorage.clear();
              logout()
            },
          });
        }}>
        Delete all data
      </Button>
      {modalContext}
    </>
  );
}

function RegisterHandler() {
  const href = useHref({ pathname: '/grid/' }, { relative: 'route' })

  return (
    <>
      <Button
        type="default"
        onClick={() => {
          try {
            navigator.registerProtocolHandler('web+grid', `${window.location.origin}${href}%s`)
            Modal.info({
              title: 'Success',
              content: 'Successfully registered grid handler for web+grid: links',
            });
          } catch (e: any) {
            Modal.error({
              title: 'Error',
              content: `Failed to register handler: ${e.message}`,
            });
          }
        }}>
        RegisterHandler
      </Button>
    </>
  );

}

export function Settings() {
  return (
    <Flex vertical >
      <Backup />
      <DeleteAll />
      <RegisterHandler />
    </Flex>
  );
}
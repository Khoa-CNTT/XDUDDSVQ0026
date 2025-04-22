import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, message, Upload, Input } from 'antd';
import { UploadOutlined, DownloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import pdfService from '../services/pdfService';

const PDFList = () => {
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchPDFs();
    }, []);

    const fetchPDFs = async () => {
        try {
            setLoading(true);
            const data = await pdfService.getAllPDFs();
            setPdfs(data);
        } catch (error) {
            console.error('Error in fetchPDFs:', error);
            message.error(error.toString());
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', file.name);
            
            await pdfService.uploadPDF(formData);
            message.success('PDF uploaded successfully');
            fetchPDFs();
        } catch (error) {
            console.error('Error in handleUpload:', error);
            message.error(error.toString());
        }
        return false;
    };

    const handleEdit = (pdf) => {
        setSelectedPdf(pdf);
        form.setFieldsValue({
            title: pdf.title,
            description: pdf.description,
        });
        setIsModalVisible(true);
    };

    const handleUpdate = async (values) => {
        try {
            await pdfService.updatePDF(selectedPdf.id, values);
            message.success('PDF updated successfully');
            setIsModalVisible(false);
            fetchPDFs();
        } catch (error) {
            console.error('Error in handleUpdate:', error);
            message.error(error.toString());
        }
    };

    const handleDelete = async (id) => {
        try {
            await pdfService.deletePDF(id);
            message.success('PDF deleted successfully');
            fetchPDFs();
        } catch (error) {
            console.error('Error in handleDelete:', error);
            message.error(error.toString());
        }
    };

    const handleDownload = async (id) => {
        try {
            const blob = await pdfService.downloadPDF(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `document.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error in handleDownload:', error);
            message.error(error.toString());
        }
    };

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'File Size',
            dataIndex: 'file_size',
            key: 'file_size',
            render: (size) => `${(size / 1024 / 1024).toFixed(2)} MB`,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <div>
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(record.id)}
                        style={{ marginRight: 8 }}
                    />
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        style={{ marginRight: 8 }}
                    />
                    <Button
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id)}
                        danger
                    />
                </div>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Upload
                    beforeUpload={handleUpload}
                    showUploadList={false}
                    accept=".pdf"
                >
                    <Button icon={<UploadOutlined />}>Upload PDF</Button>
                </Upload>
            </div>

            <Table
                columns={columns}
                dataSource={pdfs}
                loading={loading}
                rowKey="id"
            />

            <Modal
                title="Edit PDF"
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} onFinish={handleUpdate}>
                    <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true, message: 'Please input the title!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default PDFList; 
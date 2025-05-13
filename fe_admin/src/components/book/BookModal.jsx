import React, { useState, useEffect, useRef } from 'react';

export default function BookModal({ isOpen, onClose, onSave, book, categories, authors, mode }) {
    const [formData, setFormData] = useState({
        name_book: '',
        title: '',
        author_id: '',
        category_id: '',
        price: 0,
        is_free: false,
        pages: 0,
        image: '',
    });

    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (book) {
            setFormData({
                name_book: book.name_book || '',
                title: book.title || '',
                author_id: book.author_id || '',
                category_id: book.category_id || '',
                price: book.price || 0,
                is_free: book.is_free || false,
                pages: book.pages || 0,
                image: book.image || '',
            });
            setImagePreview(book.image);
        } else {
            resetForm();
        }
    }, [book]);

    const resetForm = () => {
        setFormData({
            name_book: '',
            title: '',
            author_id: '',
            category_id: '',
            price: 0,
            is_free: false,
            pages: 0,
            image: '',
        });
        setSelectedFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });

        // Handle price when is_free changes
        if (name === 'is_free' && checked) {
            setFormData(prev => ({ ...prev, price: 0 }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("File selected:", file.name, file.type);
        setSelectedFile(file);

        // Only create image previews for image files
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            // For PDFs or other non-image files
            setImagePreview(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, selectedFile);
    };

    const isReadOnly = mode === 'view';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative w-full max-w-3xl p-6 mx-auto my-8 bg-white rounded-lg shadow-xl z-10">
                <div className="flex items-start justify-between pb-3 border-b">
                    <h3 className="text-xl font-semibold">
                        {mode === 'create' ? 'Thêm Sách Mới' : mode === 'edit' ? 'Sửa Thông Tin Sách' : 'Thông Tin Sách'}
                    </h3>
                    <button
                        className="text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name_book">
                                Tên Sách
                            </label>
                            <input
                                type="text"
                                id="name_book"
                                name="name_book"
                                value={formData.name_book}
                                onChange={handleChange}
                                readOnly={isReadOnly}
                                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isReadOnly ? 'bg-gray-100' : ''}`}
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                                Tiêu Đề
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                readOnly={isReadOnly}
                                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isReadOnly ? 'bg-gray-100' : ''}`}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="author_id">
                                Tác Giả
                            </label>
                            <select
                                id="author_id"
                                name="author_id"
                                value={formData.author_id}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isReadOnly ? 'bg-gray-100' : ''}`}
                                required
                            >
                                <option value="">Chọn tác giả</option>
                                {authors && authors.length > 0 ? (
                                    authors.map(author => (
                                        <option key={author.author_id} value={author.author_id}>
                                            {author.name_author}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>Không có tác giả</option>
                                )}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category_id">
                                Danh Mục
                            </label>
                            <select
                                id="category_id"
                                name="category_id"
                                value={formData.category_id}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isReadOnly ? 'bg-gray-100' : ''}`}
                                required
                            >
                                <option value="">Chọn danh mục</option>
                                {categories.map(category => (
                                    <option key={category.category_id} value={category.category_id}>
                                        {category.name_category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="pages">
                                Số Trang
                            </label>
                            <input
                                type="number"
                                id="pages"
                                name="pages"
                                value={formData.pages}
                                onChange={handleChange}
                                readOnly={isReadOnly}
                                min="0"
                                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isReadOnly ? 'bg-gray-100' : ''}`}
                            />
                        </div>

                        <div className="mb-4">
                            <div className="flex items-center mb-2">
                                <input
                                    type="checkbox"
                                    id="is_free"
                                    name="is_free"
                                    checked={formData.is_free}
                                    onChange={handleChange}
                                    disabled={isReadOnly}
                                    className={`mr-2 ${isReadOnly ? 'opacity-50' : ''}`}
                                />
                                <label className="text-gray-700 text-sm font-bold" htmlFor="is_free">
                                    Sách Miễn Phí
                                </label>
                            </div>
                            
                            {!formData.is_free && (
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
                                        Giá (VND)
                                    </label>
                                    <input
                                        type="number"
                                        id="price"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        readOnly={isReadOnly || formData.is_free}
                                        min="0"
                                        className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isReadOnly || formData.is_free ? 'bg-gray-100' : ''}`}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mb-4 col-span-1 md:col-span-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="image">
                                Ảnh Bìa
                            </label>
                            <div className="flex flex-col items-center">
                                {imagePreview && (
                                    <img 
                                        src={imagePreview} 
                                        alt="Book Cover Preview" 
                                        className="h-40 w-32 object-cover mb-3 border rounded"
                                    />
                                )}
                                {!isReadOnly && (
                                    <input
                                        type="file"
                                        id="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*,.pdf"
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-md file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100"
                                    />
                                )}
                            </div>
                        </div>

                        {book && (
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Book ID
                                </label>
                                <input
                                    type="text"
                                    value={book.book_id}
                                    readOnly
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-100 leading-tight"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                        >
                            Đóng
                        </button>
                        {!isReadOnly && (
                            <button
                                type="submit"
                                className="px-4 py-2 ml-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                            >
                                {mode === 'create' ? 'Tạo Mới' : 'Cập Nhật'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
} 
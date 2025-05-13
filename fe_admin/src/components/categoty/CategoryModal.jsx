import React, { useState, useEffect } from "react";

export default function CategoryModal({
  isOpen,
  onClose,
  onSave,
  category,
  mode,
}) {
  const [formData, setFormData] = useState({
    name_category: "",
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name_category: category.name_category || "",
      });
    } else {
      setFormData({
        name_category: "",
      });
    }
  }, [category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const isReadOnly = mode === "view";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="relative w-full max-w-lg p-6 mx-auto my-8 bg-white rounded-lg shadow-xl z-10">
        <div className="flex items-start justify-between pb-3 border-b">
          <h3 className="text-xl font-semibold">
            {mode === "create"
              ? "Thêm Danh Mục Mới"
              : mode === "edit"
              ? "Sửa Danh Mục"
              : "Thông Tin Danh Mục"}
          </h3>
          <button
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="name_category"
            >
              Tên Danh Mục
            </label>
            <input
              type="text"
              id="name_category"
              name="name_category"
              value={formData.name_category}
              onChange={handleChange}
              readOnly={isReadOnly}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                isReadOnly ? "bg-gray-100" : ""
              }`}
              required
            />
          </div>

          {category && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Category ID
              </label>
              <input
                type="text"
                value={category.category_id}
                readOnly
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-100 leading-tight"
              />
            </div>
          )}

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
                {mode === "create" ? "Tạo Mới" : "Cập Nhật"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

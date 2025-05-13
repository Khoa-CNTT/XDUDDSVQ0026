import React, { useState, useEffect } from "react";
import { categoryAPI, bookAPI } from "../../services/api";
import CategoryTable from "./CategoryTable";
import CategoryModal from "./CategoryModal";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // 'view', 'edit', 'create'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Lấy cả danh sách danh mục và sách để tính toán số lượng
      const [categoriesResponse, booksResponse] = await Promise.all([
        categoryAPI.getAllCategories(),
        bookAPI.getAllBooks(),
      ]);

      // Ensure categoriesResponse is an array
      const categoriesData = Array.isArray(categoriesResponse)
        ? categoriesResponse
        : [];
      const booksData = Array.isArray(booksResponse) ? booksResponse : [];

      console.log("Categories data:", categoriesData);
      console.log("Books data:", booksData);

      setCategories(categoriesData);
      setBooks(booksData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data. Please try again later.");
      // Fallback to mock data
      setCategories([
        { category_id: "C001", name_category: "Tâm Lý - Kỹ Năng Sống" },
        { category_id: "C002", name_category: "Tiểu Thuyết" },
        { category_id: "C003", name_category: "Kinh Tế" },
      ]);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  // Hàm đếm số lượng sách cho mỗi danh mục
  const getBookCountByCategory = (categoryId) => {
    if (!books || !Array.isArray(books)) return 0;
    return books.filter((book) => book.category_id === categoryId).length;
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleView = (category) => {
    setSelectedCategory(category);
    setModalMode("view");
    setModalOpen(true);
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa danh mục này?")) {
      try {
        await categoryAPI.deleteCategory(categoryId);
        setCategories(
          categories.filter((category) => category.category_id !== categoryId)
        );
        alert("Xóa danh mục thành công!");
      } catch (err) {
        console.error("Failed to delete category:", err);
        alert("Không thể xóa danh mục. Vui lòng thử lại sau.");
      }
    }
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleSave = async (categoryData) => {
    console.log("Saving category with data:", categoryData);
    try {
      if (modalMode === "create") {
        console.log("Creating new category");
        const response = await categoryAPI.createCategory(categoryData);
        console.log("Create category response:", response);

        // Extract the new category data from the response
        const newCategory = response.data || response;

        setCategories([...categories, newCategory]);
        alert("Tạo danh mục mới thành công!");
      } else if (modalMode === "edit") {
        console.log("Updating category:", selectedCategory.category_id);
        const response = await categoryAPI.updateCategory(
          selectedCategory.category_id,
          categoryData
        );
        console.log("Update category response:", response);

        setCategories(
          categories.map((category) =>
            category.category_id === selectedCategory.category_id
              ? { ...category, ...categoryData }
              : category
          )
        );
        alert("Cập nhật danh mục thành công!");
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Failed to save category:", err);
      alert(
        "Không thể lưu thông tin danh mục. Vui lòng thử lại sau. Lỗi: " +
          err.message
      );
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Danh Mục</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            ></path>
          </svg>
          Thêm Danh Mục
        </button>
      </div>

      {error && (
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6"
          role="alert"
        >
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <CategoryTable
          categories={categories}
          getBookCount={getBookCountByCategory}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
      )}

      {modalOpen && (
        <CategoryModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          category={selectedCategory}
          mode={modalMode}
        />
      )}
    </div>
  );
}

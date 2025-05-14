import React, { useState, useEffect } from "react";
import { bookAPI, categoryAPI, authorAPI } from "../../services/api";
import BookTable from "./BookTable";
import BookModal from "./BookModal";

export default function Book() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // 'view', 'edit', 'create'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [booksResponse, categoriesResponse, authorsResponse] =
          await Promise.all([
            bookAPI.getAllBooks(),
            categoryAPI.getAllCategories(),
            authorAPI.getAllAuthors(),
          ]);

        // Ensure all responses are arrays
        const booksData = Array.isArray(booksResponse) ? booksResponse : [];
        const categoriesData = Array.isArray(categoriesResponse)
          ? categoriesResponse
          : [];
        const authorsData = Array.isArray(authorsResponse)
          ? authorsResponse
          : [];

        console.log("Books data:", booksData);
        console.log("Categories data:", categoriesData);
        console.log("Authors data:", authorsData);

        setBooks(booksData);
        setCategories(categoriesData);
        setAuthors(authorsData);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load data. Please try again later.");
        // Fallback to mock data
        setBooks([
          {
            book_id: "B001",
            name_book: "Đắc Nhân Tâm",
            title: "How to Win Friends and Influence People",
            author_id: "A001",
            category_id: "C001",
            price: 120000,
            is_free: false,
            pages: 320,
            created_at: "2023-01-01",
          },
          {
            book_id: "B002",
            name_book: "Nhà Giả Kim",
            title: "The Alchemist",
            author_id: "A002",
            category_id: "C002",
            price: 90000,
            is_free: false,
            pages: 224,
            created_at: "2023-02-15",
          },
        ]);
        setCategories([
          { category_id: "C001", name_category: "Tâm Lý - Kỹ Năng Sống" },
          { category_id: "C002", name_category: "Tiểu Thuyết" },
        ]);
        setAuthors([
          { author_id: "A001", name_author: "Dale Carnegie" },
          { author_id: "A002", name_author: "Paulo Coelho" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEdit = (book) => {
    setSelectedBook(book);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleView = (book) => {
    setSelectedBook(book);
    setModalMode("view");
    setModalOpen(true);
  };

  const handleDelete = async (bookId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sách này?")) {
      try {
        await bookAPI.deleteBook(bookId);
        setBooks(books.filter((book) => book.book_id !== bookId));
        alert("Xóa sách thành công!");
      } catch (err) {
        console.error("Failed to delete book:", err);
        alert("Không thể xóa sách. Vui lòng thử lại sau.");
      }
    }
  };

  const handleCreate = () => {
    setSelectedBook(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleSave = async (bookData) => {
    try {
      let updatedBookData = { ...bookData };

      // Ensure price is a number
      if (updatedBookData.price) {
        updatedBookData.price = Number(updatedBookData.price);
      }

      // Ensure is_free is a boolean
      updatedBookData.is_free = Boolean(updatedBookData.is_free);

      // Convert pages to a number if provided
      if (updatedBookData.pages) {
        updatedBookData.pages = Number(updatedBookData.pages);
      }

      console.log("Saving book with data:", updatedBookData);

      if (modalMode === "create") {
        const newBook = await bookAPI.createBook(updatedBookData);
        setBooks([...books, newBook]);
        alert("Thêm sách mới thành công!");
      } else if (modalMode === "edit") {
        // Process data the same way as in createBook
        const processedData = {
          ...updatedBookData,
          price: updatedBookData.is_free
            ? 0
            : parseFloat(updatedBookData.price) || 0,
          pages: updatedBookData.pages
            ? parseInt(updatedBookData.pages, 10)
            : null,
          is_free: !!updatedBookData.is_free,
        };

        await bookAPI.updateBook(selectedBook.book_id, processedData);
        setBooks(
          books.map((book) =>
            book.book_id === selectedBook.book_id
              ? { ...book, ...processedData }
              : book
          )
        );
        alert("Cập nhật sách thành công!");
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Failed to save book:", err);

      // Extract and display validation errors if available
      let errorMessage = "Không thể lưu thông tin sách. ";
      if (err.response && err.response.data && err.response.data.errors) {
        const errors = err.response.data.errors;
        const errorDetails = Object.keys(errors)
          .map((field) => `${field}: ${errors[field].join(", ")}`)
          .join("\n");
        errorMessage += `Lỗi kiểm tra: \n${errorDetails}`;
      } else if (err.data && err.data.errors) {
        const errors = err.data.errors;
        const errorDetails = Object.keys(errors)
          .map((field) => `${field}: ${errors[field].join(", ")}`)
          .join("\n");
        errorMessage += `Lỗi kiểm tra: \n${errorDetails}`;
      } else {
        errorMessage += err.message || "Vui lòng thử lại sau.";
      }

      alert(errorMessage);
    }
  };

  const handleDebug = () => {
    console.log("Debug - Authors:", authors);
    alert(`Authors loaded: ${authors.length}`);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Sách</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDebug}
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
          >
            Debug
          </button>
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
            Thêm Sách
          </button>
        </div>
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
        <BookTable
          books={books}
          categories={categories}
          authors={authors}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
      )}

      {modalOpen && (
        <BookModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          book={selectedBook}
          categories={categories}
          authors={authors}
          mode={modalMode}
        />
      )}
    </div>
  );
}

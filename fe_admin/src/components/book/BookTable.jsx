import React from "react";

export default function BookTable({
  books = [],
  categories = [],
  authors = [],
  onEdit,
  onDelete,
  onView,
}) {
  // Helper function to find category name by ID
  const getCategoryName = (categoryId) => {
    if (!categories || !Array.isArray(categories)) return "Unknown";
    const category = categories.find(
      (cat) => cat && cat.category_id === categoryId
    );
    return category ? category.name_category : "Unknown";
  };

  // Helper function to find author name by ID
  const getAuthorName = (authorId) => {
    if (!authors || !Array.isArray(authors)) return "Unknown";
    const author = authors.find((aut) => aut && aut.author_id === authorId);
    return author ? author.name_author : "Unknown";
  };

  // Ensure books is an array
  const safeBooks = Array.isArray(books) ? books : [];

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              ID
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Tên Sách
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Tiêu Đề
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Tác Giả
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Danh Mục
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Ảnh
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Giá
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Trang
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Miễn Phí
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {safeBooks.length === 0 ? (
            <tr>
              <td
                colSpan="10"
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                Không có dữ liệu sách
              </td>
            </tr>
          ) : (
            safeBooks.map((book, index) => (
              <tr
                key={book.book_id || index}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {book.book_id || "N/A"}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  <div
                    className="max-w-[150px] truncate"
                    title={book.name_book || "N/A"}
                  >
                    {book.name_book || "N/A"}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  <div
                    className="max-w-[200px] truncate"
                    title={book.title || "N/A"}
                  >
                    {book.title || "N/A"}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  <div
                    className="max-w-[120px] truncate"
                    title={getAuthorName(book.author_id)}
                  >
                    {getAuthorName(book.author_id)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  <div
                    className="max-w-[120px] truncate"
                    title={getCategoryName(book.category_id)}
                  >
                    {getCategoryName(book.category_id)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {book.image ? (
                    <img
                      src={book.image}
                      alt={book.name_book || "Book"}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <span className="text-gray-400">No image</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {book.price
                    ? new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(book.price)
                    : "N/A"}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {book.pages || "N/A"}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {book.is_free ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Yes
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onView && onView(book)}
                    className="text-indigo-600 hover:text-indigo-900 mr-2"
                    title="Xem"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 inline"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEdit && onEdit(book)}
                    className="text-blue-600 hover:text-blue-900 mr-2"
                    title="Sửa"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 inline"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete && onDelete(book.book_id)}
                    className="text-red-600 hover:text-red-900"
                    title="Xóa"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 inline"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

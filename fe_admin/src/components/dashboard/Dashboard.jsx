import React, { useState, useEffect } from "react";
import { bookAPI, categoryAPI, userAPI } from "../../services/api";

// Simple statistics card component
function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
      <div className={`rounded-full p-3 mr-4 ${color}`}>{icon}</div>
      <div>
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

// Recent items table component
function RecentItemsTable({ title, items, headers, renderRow }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-4 text-center text-sm text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              items.map((item, index) => renderRow(item, index))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    books: 0,
    categories: 0,
    users: 0,
    freeBooks: 0,
  });
  const [recentBooks, setRecentBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to ensure we're working with arrays
  const ensureArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === "object" && data.data && Array.isArray(data.data))
      return data.data;
    console.warn("Expected array data but received:", data);
    return [];
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all data with error handling already built into the API service
        const booksResponse = await bookAPI.getAllBooks();
        const categoriesResponse = await categoryAPI.getAllCategories();
        const usersResponse = await userAPI.getAllUsers();

        // Ensure we have arrays to work with
        const booksData = ensureArray(booksResponse);
        const categoriesData = ensureArray(categoriesResponse);
        const usersData = ensureArray(usersResponse);

        console.log("Books data:", booksData);
        console.log("Categories data:", categoriesData);
        console.log("Users data:", usersData);

        // Set statistics - if data arrays are empty, stats will be zero
        setStats({
          books: booksData.length,
          categories: categoriesData.length,
          users: usersData.length,
          freeBooks: booksData.filter((book) => book && book.is_free).length,
        });

        // Set recent books (sort by created_at) if there are any
        if (booksData.length > 0) {
          const sortedBooks = [...booksData]
            .filter((book) => book && book.created_at) // Make sure created_at exists
            .sort((a, b) => {
              return new Date(b.created_at) - new Date(a.created_at);
            })
            .slice(0, 5);

          setRecentBooks(sortedBooks);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(
          "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng và API."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Book icon for statistics
  const BookIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 text-white"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
    </svg>
  );

  // User icon
  const UserIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 text-white"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
    </svg>
  );

  // Category icon
  const CategoryIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 text-white"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
    </svg>
  );

  // Free book icon
  const FreeBookIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 text-white"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Tổng Số Sách"
              value={stats.books}
              icon={<BookIcon />}
              color="bg-blue-500"
            />
            <StatCard
              title="Sách Miễn Phí"
              value={stats.freeBooks}
              icon={<FreeBookIcon />}
              color="bg-green-500"
            />
            <StatCard
              title="Danh Mục"
              value={stats.categories}
              icon={<CategoryIcon />}
              color="bg-yellow-500"
            />
            <StatCard
              title="Người Dùng"
              value={stats.users}
              icon={<UserIcon />}
              color="bg-purple-500"
            />
          </div>

          <div className="mb-8">
            <RecentItemsTable
              title="Sách"
              items={recentBooks}
              headers={["ID", "Tên Sách", "Trạng Thái", "Ngày Tạo"]}
              renderRow={(book, index) => (
                <tr
                  key={book.book_id}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {book.book_id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {book.name_book}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {book.is_free ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Miễn phí
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Trả phí
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {book.created_at
                      ? new Date(book.created_at).toLocaleDateString("vi-VN")
                      : "N/A"}
                  </td>
                </tr>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}

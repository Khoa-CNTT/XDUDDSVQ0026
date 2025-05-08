# Ứng dụng Đọc Sách và Quản Lý Tài Liệu

Ứng dụng di động hỗ trợ đọc sách điện tử với các tính năng như nhập và xử lý tệp PDF, quản lý sách, chỉnh sửa nội dung, đọc sách trực tuyến và hơn thế nữa.

## 📱 Tính Năng Chính

- **Thư viện sách**: Lưu trữ, phân loại và quản lý sách theo danh mục
- **Đọc sách**: Hỗ trợ đọc và quản lý tài liệu PDF
- **Tìm kiếm**: Tìm kiếm nhanh sách và tài liệu theo tên, tác giả
- **Hệ thống tài khoản**: 
  - Đăng ký, đăng nhập và quản lý tài khoản người dùng
  - Tự động đăng nhập (72 giờ)
  - Đồng bộ trạng thái đăng nhập giữa các thiết bị
- **Bookmark**: Lưu và quản lý sách yêu thích
- **Theo dõi tiến trình đọc**: 
  - Tự động lưu và hiển thị tiến trình đọc sách
  - Đồng bộ tiến trình giữa các thiết bị
  - Hiển thị thống kê thời gian đọc
  - Đánh dấu trang và ghi chú
- **Nhập và Xử Lý Tệp:** Hỗ trợ các định dạng PDF, DOC; cho phép chỉnh sửa nội dung sau khi trích xuất
- **Chuyển Văn Bản Thành Giọng Nói (TTS):** Đọc to nội dung sách với giọng nói tự nhiên
- **Dịch Thuật:** Hỗ trợ dịch nội dung sách sang nhiều ngôn ngữ khác nhau

## 🛠️ Công Nghệ Sử Dụng

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: Expo Router
- **Styling**: NativeWind (TailwindCSS)
- **State Management**: React Hooks
- **API Client**: Fetch API
- **Storage**: AsyncStorage
- **Thư Viện**:
  - **Text-to-Speech**: react-native-tts
  - **Dịch Thuật**: i18next
  - **Xử Lý Tệp**: react-native-document-picker, mammoth.js

### Backend
- **Framework**: Laravel
- **Database**: MySQL
- **Authentication**: Sanctum
- **API**: RESTful API
- **File Storage**: Laravel Storage

## 🏗️ Kiến Trúc Hệ Thống

Ứng dụng được xây dựng dựa trên kiến trúc client-server:
- **Client (Frontend)**: Ứng dụng React Native chạy trên thiết bị di động
- **Server (Backend)**: API Laravel cung cấp dịch vụ và quản lý dữ liệu
- **Database**: MySQL lưu trữ dữ liệu sách, tài khoản người dùng và tiến trình đọc sách

## 🗃️ Cơ Sở Dữ Liệu

![image](https://github.com/user-attachments/assets/52185ee6-812e-4f3b-af12-20f9f8e288d4)

### Bảng user_sessions
- Theo dõi phiên đăng nhập người dùng
- Lưu token và thời gian hết hạn
- Quản lý đăng nhập từ nhiều thiết bị

### Bảng reading_progress
- Lưu tiến trình đọc sách của người dùng
- Theo dõi thời gian đọc và trang hiện tại
- Lưu trữ đánh dấu trang và ghi chú

## ⚙️ Cài Đặt và Chạy Dự Án

### Yêu Cầu Hệ Thống
- Node.js và npm/yarn
- PHP 8.1+
- Composer
- MySQL
- XAMPP (khuyến nghị)

### Cài Đặt Backend (Laravel)

1. Clone dự án và di chuyển vào thư mục Backend
```bash
git clone <repository-url>
cd DoAn-Book/Backend
```

2. Cài đặt các dependency
```bash
composer install
```

3. Cấu hình môi trường
```bash
cp .env.example .env
php artisan key:generate
```

4. Cấu hình database trong file .env
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=doan_book
DB_USERNAME=root
DB_PASSWORD=
```

5. Chạy migration và seeder
```bash
php artisan migrate
php artisan db:seed
```

6. Khởi chạy server
```bash
php artisan serve
```

### Cài Đặt Frontend (React Native)

1. Di chuyển vào thư mục Frontend
```bash
cd ../Frontend
```

2. Cài đặt các dependency
```bash
npm install
# hoặc
yarn install
```

3. Cấu hình URL API Backend
Mở file `app/config.js` và cập nhật URL API:
```javascript
export const API_URL = 'http://localhost:8000/api'; // Thay đổi theo URL của server backend
```

4. Chạy ứng dụng
```bash
npx expo start
```

## 📱 Cấu Trúc Ứng Dụng

### Frontend

```
/app                     # Thư mục chính ứng dụng
  /(auth)                # Màn hình xác thực (đăng nhập, đăng ký)
  /(tabs)                # Các tab chính của ứng dụng
  /Books                 # Màn hình chi tiết sách
  /components            # Components tái sử dụng
  /services              # Service API
  /screen                # Các màn hình khác
  /config.js             # Cấu hình API và hằng số
/assets                  # Hình ảnh và tài nguyên
```

### Backend

```
/app                     # Logic chính của ứng dụng
  /Http/Controllers      # Xử lý API requests
  /Models                # Các model database
/routes                  # Định nghĩa API routes
  /api.php               # API endpoints
/database                # Migrations và seeders
/storage                 # Lưu trữ file và tài liệu
```

## 🌐 API Endpoints

### Authentication
- `POST /api/dang-nhap` - Đăng nhập (với tùy chọn tự động đăng nhập)
- `POST /api/dang-ky` - Đăng ký
- `POST /api/dang-xuat` - Đăng xuất
- `POST /api/quen-mat-khau` - Quên mật khẩu
- `GET /api/check-auth` - Kiểm tra trạng thái đăng nhập

### Books
- `GET /api/books` - Lấy danh sách sách
- `GET /api/books/{id}` - Lấy chi tiết sách
- `GET /api/books/category/{categoryId}` - Lấy sách theo danh mục
- `GET /api/books/search` - Tìm kiếm sách

### Categories
- `GET /api/categories` - Lấy danh sách danh mục

### User
- `GET /api/user` - Lấy thông tin người dùng
- `POST /api/doi-mat-khau` - Đổi mật khẩu
- `POST /api/cap-nhat-thong-tin` - Cập nhật thông tin người dùng

### Reading Progress
- `GET /api/reading-progress/{bookId}` - Lấy tiến trình đọc sách
- `POST /api/reading-progress/update` - Cập nhật tiến trình đọc
- `GET /api/reading-stats` - Lấy thống kê đọc sách
- `POST /api/bookmarks` - Thêm đánh dấu trang
- `GET /api/bookmarks/{bookId}` - Lấy danh sách đánh dấu trang

## 📄 Hướng Dẫn Sử Dụng

1. **Đăng nhập/Đăng ký**: Tạo tài khoản hoặc đăng nhập vào ứng dụng
2. **Trang chủ**: Khám phá sách nổi bật và sách được đề xuất
3. **Thư viện sách**: Truy cập vào sách đã lưu và tài liệu
4. **Cửa hàng**: Duyệt và tìm kiếm sách theo danh mục
5. **Đọc sách**: Mở sách để đọc, hệ thống sẽ tự động lưu tiến trình đọc

## 📝 Giấy Phép

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## 👥 Liên Hệ

Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ, vui lòng liên hệ:

- Email: trangtrqss@gmail.com
- Github: [https://github.com/KhaiMoi]

---

© 2025 DoAn-Book. Tất cả các quyền được bảo lưu.

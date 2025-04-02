# Ứng dụng Đọc Sách và Quản Lý Tài Liệu

Ứng dụng di động hỗ trợ đọc sách điện tử với các tính năng như nhập và xử lý tệp (PDF, DOC), chỉnh sửa nội dung, chuyển văn bản thành giọng nói (Text-to-Speech), dịch thuật và quản lý từ vựng.

## Tính Năng Chính

- **Nhập và Xử Lý Tệp:** Hỗ trợ các định dạng PDF, DOC; cho phép chỉnh sửa nội dung sau khi trích xuất.
- **Chuyển Văn Bản Thành Giọng Nói (TTS):** Đọc to nội dung sách với giọng nói tự nhiên.
- **Dịch Thuật:** Hỗ trợ dịch nội dung sách sang nhiều ngôn ngữ khác nhau.
- **Quản Lý Từ Vựng:** Lưu trữ và quản lý các từ vựng quan trọng trong quá trình đọc.

## Công Nghệ Sử Dụng

- **Frontend:** React Native
- **Backend:** Laravel
- **Cơ Sở Dữ Liệu:** MySQL
- **Thư Viện và API:**
  - **Text-to-Speech:** react-native-tts
  - **Dịch Thuật:** i18next
  - **Xử Lý Tệp:** react-native-document-picker, mammoth.js

## Cài Đặt

1. **Yêu Cầu Hệ Thống:**
   - PHP
   - Composer
   - MySQL

2. **Cài Đặt Backend:**
   ```bash
   git clone <repository-backend-url>
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate

# Ứng dụng Đọc Sách và Quản Lý Tài Liệu

Ứng dụng di động hỗ trợ đọc sách điện tử với các tính năng như nhập và xử lý tệp (PDF, DOC), chỉnh sửa nội dung, chuyển văn bản thành giọng nói (Text-to-Speech), dịch thuật và quản lý từ vựng.

## Tính Năng Chính

- **Nhập và Xử Lý Tệp:** Hỗ trợ các định dạng PDF, DOC; cho phép chỉnh sửa nội dung sau khi trích xuất.
- **Chuyển Văn Bản Thành Giọng Nói (TTS):** Đọc to nội dung sách với giọng nói tự nhiên.
- **Dịch Thuật:** Hỗ trợ dịch nội dung sách sang nhiều ngôn ngữ khác nhau.

## Công Nghệ Sử Dụng

- **Frontend:** React Native
- **Backend:** Laravel
- **Cơ Sở Dữ Liệu:** MySQL
- **Thư Viện và API:**
  - **Text-to-Speech:** react-native-tts
  - **Dịch Thuật:** i18next
  - **Xử Lý Tệp:** react-native-document-picker, mammoth.js

## Cơ Sở Dữ Liệu

![image](https://github.com/user-attachments/assets/52185ee6-812e-4f3b-af12-20f9f8e288d4)



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

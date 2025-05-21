<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UpdateBooksFileSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lấy danh sách tất cả sách
        $books = DB::table('books')->get();
        
        foreach ($books as $book) {
            $bookId = $book->book_id;
            $file_path = null;
            
            // Xác định thư mục dựa trên book_id
            if (in_array($bookId, ['BOOK000001', 'BOOK000002', 'BOOK000003', 'BOOK000004'])) {
                $category = 'Giải trí';
            } elseif (in_array($bookId, ['BOOK000005', 'BOOK000006', 'BOOK000007', 'BOOK000008', 'BOOK000009', 'BOOK000010'])) {
                $category = 'Phiêu lưu - Trinh thám';
            } elseif (in_array($bookId, ['BOOK000011', 'BOOK000012', 'BOOK000013', 'BOOK000014', 'BOOK000015', 'BOOK000016'])) {
                $category = 'Thể thao - Võ thuật';
            } elseif (in_array($bookId, ['BOOK000017', 'BOOK000018', 'BOOK000019', 'BOOK000020', 'BOOK000021'])) {
                $category = 'Thiếu nhi';
            } elseif (in_array($bookId, ['BOOK000022', 'BOOK000023', 'BOOK000024', 'BOOK000025', 'BOOK000026', 'BOOK000027'])) {
                $category = 'Lịch sử';
            } else {
                continue; // Bỏ qua nếu không xác định được thư mục
            }
            
            // Tạo đường dẫn tới file PDF
            $file_path = "/storage/books/{$category}/{$bookId}.pdf";
            
            // Cập nhật database
            DB::table('books')
                ->where('book_id', $bookId)
                ->update(['file_path' => $file_path]);
            
            $this->command->info("Đã cập nhật đường dẫn cho sách {$bookId}: {$file_path}");
        }
    }
}

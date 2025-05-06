<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Author;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BookController extends Controller
{
    public function danhSach()
    {
        $books = Book::with(['author', 'category'])->get();
        
        return response()->json([
            'status' => true,
            'data' => $books
        ]);
    }
    
    public function chiTiet($id)
    {
        $book = Book::with(['author', 'category', 'chapters'])->find($id);
        
        if (!$book) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy sách!'
            ]);
        }
        
        return response()->json([
            'status' => true,
            'data' => $book
        ]);
    }
    
    public function themMoi(Request $request)
    {
        $bookId = 'BOOK' . Str::random(6);
        
        $data = $request->all();
        $data['book_id'] = $bookId;
        
        // Xử lý trường is_free
        if (isset($data['is_free']) && $data['is_free']) {
            $data['is_free'] = true;
            $data['is_favorite'] = false;
            $data['is_saved'] = false;
            $data['price'] = 0; // Đặt giá = 0 nếu sách miễn phí
        } else {
            $data['is_free'] = false;
            // Đảm bảo price được cung cấp nếu sách có phí
            if (!isset($data['price']) || $data['price'] <= 0) {
                return response()->json([
                    'status' => false,
                    'message' => 'Vui lòng nhập giá cho sách không miễn phí!'
                ]);
            }
        }
        
        $book = Book::create($data);
        
        return response()->json([
            'status' => true,
            'message' => 'Đã thêm sách thành công!',
            'data' => $book
        ]);
    }
    
    public function capNhat(Request $request, $id)
    {
        $book = Book::find($id);
        
        if (!$book) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy sách!'
            ]);
        }
        
        $data = $request->all();
        
        // Xử lý trường is_free
        if (isset($data['is_free']) && $data['is_free']) {
            $data['is_free'] = true;
            $data['price'] = 0; // Đặt giá = 0 nếu sách miễn phí
        } else if (isset($data['is_free'])) {
            $data['is_free'] = false;
            $data['is_favorite'] = false;
            $data['is_saved'] = false;
            // Đảm bảo price được cung cấp nếu sách có phí
            if (!isset($data['price']) || $data['price'] <= 0) {
                return response()->json([
                    'status' => false,
                    'message' => 'Vui lòng nhập giá cho sách không miễn phí!'
                ]);
            }
        }
        
        $book->update($data);
        
        return response()->json([
            'status' => true,
            'message' => 'Đã cập nhật sách thành công!',
            'data' => $book
        ]);
    }
    
    public function xoa($id)
    {
        $book = Book::find($id);
        
        if (!$book) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy sách!'
            ]);
        }
        
        $book->delete();
        
        return response()->json([
            'status' => true,
            'message' => 'Đã xóa sách thành công!'
        ]);
    }
    
    public function timKiem(Request $request)
    {
        $query = $request->query('q');
        
        $books = Book::where('name_book', 'like', "%{$query}%")
                    ->orWhere('title', 'like', "%{$query}%")
                    ->with(['author', 'category'])
                    ->get();
        
        return response()->json([
            'status' => true,
            'data' => $books
        ]);
    }
    
    public function theoTheLoai($categoryId)
    {
        $books = Book::where('category_id', $categoryId)
                    ->with(['author', 'category'])
                    ->get();
        
        return response()->json([
            'status' => true,
            'data' => $books
        ]);
    }
    
    public function theoTacGia($authorId)
    {
        $books = Book::where('author_id', $authorId)
                    ->with(['author', 'category'])
                    ->get();
        
        return response()->json([
            'status' => true,
            'data' => $books
        ]);
    }
    public function luuSach(Request $request, $id)
    {
        $book = Book::find($id);
        $book->is_saved = $request->input('is_saved');
        $book->save();
        return response()->json(['status' => true]);
    }
    public function sachMienPhi()
    {
        $books = Book::where('is_free', true)
                    ->with(['author', 'category'])
                    ->get();
        
        return response()->json([
            'status' => true,
            'data' => $books
        ]);
    }
    
    // public function sachCoPhi()
    // {
    //     $books = Book::where('is_free', false)
    //                 ->with(['author', 'category'])
    //                 ->get();
        
    //     return response()->json([
    //         'status' => true,
    //         'data' => $books
    //     ]);
    // }
    /**
     * Trích xuất ảnh bìa từ PDF
     */
    public function extractCover(Request $request)
    {
        if (!$request->hasFile('pdf')) {
            return response()->json([
                'status' => false,
                'message' => 'Không có file PDF được tải lên'
            ]);
        }
        
        $file = $request->file('pdf');
        $tempPath = $file->store('temp_pdfs', 'public');
        $fullPath = storage_path('app/public/' . $tempPath);
        
        try {
            // Sử dụng thư viện ImageMagick để trích xuất trang đầu tiên
            $outputImagePath = storage_path('app/public/covers/' . uniqid() . '.jpg');
            
            // Tạo thư mục nếu chưa tồn tại
            if (!file_exists(storage_path('app/public/covers'))) {
                mkdir(storage_path('app/public/covers'), 0777, true);
            }
            
            // Chuyển đổi trang đầu tiên của PDF thành ảnh
            $command = "convert -density 150 -quality 90 '{$fullPath}[0]' '{$outputImagePath}'";
            exec($command, $output, $returnVar);
            
            if ($returnVar !== 0) {
                throw new \Exception('Không thể trích xuất ảnh bìa');
            }
            
            $coverImageUrl = asset('storage/covers/' . basename($outputImagePath));
            
            // Xóa file tạm thời
            unlink($fullPath);
            
            return response()->json([
                'status' => true,
                'coverImageUrl' => $coverImageUrl
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Lỗi khi trích xuất ảnh bìa: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Tải lên sách PDF
     */
    public function upload(Request $request)
    {
        if (!$request->hasFile('pdf')) {
            return response()->json([
                'status' => false,
                'message' => 'Không có file PDF được tải lên'
            ]);
        }
        
        try {
            $file = $request->file('pdf');
            $fileName = uniqid() . '.pdf';
            $pdfPath = $file->storeAs('pdfs', $fileName, 'public');
            
            $bookId = 'BOOK' . Str::random(6);
            
            // Lưu thông tin sách vào database
            $book = Book::create([
                'book_id' => $bookId,
                'name_book' => $request->input('title'),
                'title' => $request->input('title'),
                'image' => $request->input('coverImage', null),
                'created_at' => now(),
                'author_id' => 'AUTH000001', // Mặc định hoặc từ request
                'category_id' => 'CAT000001', // Mặc định hoặc từ request
                'price' => 0,
                'is_free' => true,
                'file_path' => asset('storage/' . $pdfPath)
            ]);
            
            return response()->json([
                'status' => true,
                'message' => 'Đã tải lên sách thành công',
                'data' => $book
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Lỗi khi tải lên sách: ' . $e->getMessage()
            ]);
        }
    }

    public function yeuThichSach(Request $request, $id)
    {
        $book = Book::find($id);
        $book->is_favorite = $request->input('is_favorite');
        $book->save();
        return response()->json(['status' => true]);
    }
} 
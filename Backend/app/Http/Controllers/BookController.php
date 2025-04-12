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
    
    public function sachCoPhi()
    {
        $books = Book::where('is_free', false)
                    ->with(['author', 'category'])
                    ->get();
        
        return response()->json([
            'status' => true,
            'data' => $books
        ]);
    }
} 
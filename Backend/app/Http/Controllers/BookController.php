<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Author;
use App\Models\Category;
use App\Models\UserBookPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

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
    
    public function chiTiet($id, Request $request)
    {
        $book = Book::with(['author', 'category', 'chapters'])->find($id);
        
        if (!$book) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy sách!'
            ]);
        }
        
        // Lấy trạng thái cá nhân hóa nếu có token
        $is_saved = false;
        $is_favorite = false;
        $user = null;
        if ($request->bearerToken()) {
            $tokenModel = PersonalAccessToken::findToken($request->bearerToken());
            if ($tokenModel && $tokenModel->tokenable) {
                $user = $tokenModel->tokenable;
                $preference = UserBookPreference::where('user_id', $user->user_id)
                    ->where('book_id', $book->book_id)
                    ->first();
                if ($preference) {
                    $is_saved = $preference->is_saved;
                    $is_favorite = $preference->is_favorite;
                }
            }
        }
        
        return response()->json([
            'status' => true,
            'data' => array_merge(
                $book->toArray(),
                [
                    'is_saved' => $is_saved,
                    'is_favorite' => $is_favorite
                ]
            )
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
        
        if (empty($query)) {
            return response()->json([
                'status' => true,
                'data' => []
            ]);
        }
        
        $books = Book::where('name_book', 'like', "%{$query}%")
                    ->orWhere('title', 'like', "%{$query}%")
                    ->orWhereHas('author', function($q) use ($query) {
                        $q->where('name_author', 'like', "%{$query}%");
                    })
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

    private function getUserFromRequest($request)
    {
        $token = $request->bearerToken();
        if (!$token) return null;
        $tokenModel = PersonalAccessToken::findToken($token);
        return $tokenModel ? $tokenModel->tokenable : null;
    }

    public function luuSach(Request $request, $id)
    {
        try {
            $user = $this->getUserFromRequest($request);
            if (!$user) {
                return response()->json([
                    'status' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $book = Book::find($id);
            if (!$book) {
                return response()->json([
                    'status' => false,
                    'message' => 'Không tìm thấy sách!'
                ], 404);
            }

            // Tìm hoặc tạo mới preference
            $preference = UserBookPreference::firstOrNew([
                'user_id' => $user->user_id,
                'book_id' => $book->book_id
            ]);

            // Cập nhật trạng thái lưu
            $preference->is_saved = $request->input('is_saved', true);
            $preference->save();

            return response()->json([
                'status' => true,
                'message' => $preference->is_saved ? 'Đã lưu sách thành công' : 'Đã xóa sách khỏi danh sách đã lưu',
                'data' => $preference
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error in luuSach: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
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
    
    /**
     * Lấy danh sách sách xu hướng (sách được tìm kiếm nhiều nhất)
     */
    public function xuHuong()
    {
        try {
            // Lấy các ID sách được yêu thích nhiều nhất
            $popularBookIds = UserBookPreference::where('is_favorite', true)
                ->select('book_id')
                ->groupBy('book_id')
                ->orderByRaw('COUNT(*) DESC')
                ->limit(5)
                ->pluck('book_id')
                ->toArray();
            
            // Lấy thông tin đầy đủ của những sách này
            $favoriteBooks = Book::whereIn('book_id', $popularBookIds)
                ->with(['author', 'category'])
                ->get();
                
            // Lấy ID sách đã có để loại trừ
            $excludeIds = $favoriteBooks->pluck('book_id')->toArray();
            
            // Số lượng sách cần bổ sung ngẫu nhiên
            $randomCount = 5 - count($favoriteBooks);
            
            // Lấy thêm sách ngẫu nhiên nếu cần
            $randomBooks = collect([]);
            if ($randomCount > 0) {
                $randomBooks = Book::whereNotIn('book_id', $excludeIds)
                    ->inRandomOrder()
                    ->limit($randomCount)
                    ->with(['author', 'category'])
                    ->get();
            }
            
            // Kết hợp kết quả
            $trendingBooks = $favoriteBooks->merge($randomBooks);
            
            return response()->json([
                'status' => true,
                'data' => $trendingBooks
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Lỗi khi lấy sách xu hướng: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Có lỗi xảy ra khi lấy sách xu hướng',
                'error' => $e->getMessage()
            ]);
        }
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
        try {
            $user = $this->getUserFromRequest($request);
            if (!$user) {
                return response()->json([
                    'status' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $book = Book::find($id);
            if (!$book) {
                return response()->json([
                    'status' => false,
                    'message' => 'Không tìm thấy sách!'
                ], 404);
            }

            $preference = UserBookPreference::firstOrNew([
                'user_id' => $user->user_id,
                'book_id' => $book->book_id
            ]);

            $preference->is_favorite = $request->input('is_favorite', true);
            $preference->save();

            return response()->json([
                'status' => true,
                'message' => $preference->is_favorite ? 'Đã thêm vào danh sách yêu thích' : 'Đã xóa khỏi danh sách yêu thích',
                'data' => $preference
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error in yeuThichSach: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getUserBooks(Request $request)
    {
        try {
            $user = $this->getUserFromRequest($request);
            if (!$user) {
                return response()->json([
                    'status' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }
            $userId = $user->user_id;

            $savedBooks = Book::whereHas('preferences', function($query) use ($userId) {
                $query->where('is_saved', true)
                      ->where('user_id', $userId);
            })->with(['author', 'category'])->get();

            $favoriteBooks = Book::whereHas('preferences', function($query) use ($userId) {
                $query->where('is_favorite', true)
                      ->where('user_id', $userId);
            })->with(['author', 'category'])->get();

            return response()->json([
                'status' => true,
                'data' => [
                    'saved_books' => $savedBooks,
                    'favorite_books' => $favoriteBooks
                ]
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error in getUserBooks: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }
} 
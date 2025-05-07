<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Book;
use App\Models\UserBookPreference;
use Laravel\Sanctum\PersonalAccessToken;

class UserBookPreferenceController extends Controller
{
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

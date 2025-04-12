<?php

namespace App\Http\Controllers;

use App\Models\Author;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthorController extends Controller
{
    public function danhSach()
    {
        $authors = Author::withCount('books')->get();
        
        return response()->json([
            'status' => true,
            'data' => $authors
        ]);
    }
    
    public function chiTiet($id)
    {
        $author = Author::with('books')->find($id);
        
        if (!$author) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy tác giả!'
            ]);
        }
        
        return response()->json([
            'status' => true,
            'data' => $author
        ]);
    }
    
    public function themMoi(Request $request)
    {
        $authorId = 'AUTH' . Str::random(6);
        
        $data = $request->all();
        $data['author_id'] = $authorId;
        
        $author = Author::create($data);
        
        return response()->json([
            'status' => true,
            'message' => 'Đã thêm tác giả thành công!',
            'data' => $author
        ]);
    }
    
    public function capNhat(Request $request, $id)
    {
        $author = Author::find($id);
        
        if (!$author) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy tác giả!'
            ]);
        }
        
        $author->update($request->all());
        
        return response()->json([
            'status' => true,
            'message' => 'Đã cập nhật tác giả thành công!',
            'data' => $author
        ]);
    }
    
    public function xoa($id)
    {
        $author = Author::find($id);
        
        if (!$author) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy tác giả!'
            ]);
        }
        
        $author->delete();
        
        return response()->json([
            'status' => true,
            'message' => 'Đã xóa tác giả thành công!'
        ]);
    }
    
    public function timKiem(Request $request)
    {
        $query = $request->query('q');
        
        $authors = Author::where('name_author', 'like', "%{$query}%")
                     ->orWhere('nationality', 'like', "%{$query}%")
                     ->withCount('books')
                     ->get();
        
        return response()->json([
            'status' => true,
            'data' => $authors
        ]);
    }
} 
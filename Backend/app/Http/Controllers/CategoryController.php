<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function danhSach()
    {
        $categories = Category::withCount('books')->get();
        
        return response()->json([
            'status' => true,
            'data' => $categories
        ]);
    }
    
    public function chiTiet($id)
    {
        $category = Category::with('books')->find($id);
        
        if (!$category) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy thể loại!'
            ]);
        }
        
        return response()->json([
            'status' => true,
            'data' => $category
        ]);
    }
    
    public function themMoi(Request $request)
    {
        $categoryId = 'CAT' . Str::random(7);
        
        $data = $request->all();
        $data['category_id'] = $categoryId;
        
        $category = Category::create($data);
        
        return response()->json([
            'status' => true,
            'message' => 'Đã thêm thể loại thành công!',
            'data' => $category
        ]);
    }
    
    public function capNhat(Request $request, $id)
    {
        $category = Category::find($id);
        
        if (!$category) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy thể loại!'
            ]);
        }
        
        $category->update($request->all());
        
        return response()->json([
            'status' => true,
            'message' => 'Đã cập nhật thể loại thành công!',
            'data' => $category
        ]);
    }
    
    public function xoa($id)
    {
        $category = Category::find($id);
        
        if (!$category) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy thể loại!'
            ]);
        }
        
        $category->delete();
        
        return response()->json([
            'status' => true,
            'message' => 'Đã xóa thể loại thành công!'
        ]);
    }
} 
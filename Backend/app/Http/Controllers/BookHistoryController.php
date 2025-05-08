<?php

namespace App\Http\Controllers;

use App\Models\BookReadingHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BookHistoryController extends Controller
{
    public function getUserHistory(Request $request)
    {
        $userId = $request->user()->user_id;
        $history = BookReadingHistory::where('user_id', $userId)
            ->orderBy('last_read_at', 'desc')
            ->get();
            
        return response()->json([
            'status' => true,
            'data' => $history
        ]);
    }
    
    public function updateHistory(Request $request)
    {
        Log::debug('Book history request data: ' . json_encode($request->all()));
        
        $validated = $request->validate([
            'book_id' => 'required|string',
            'current_page' => 'required|integer',
            'total_pages' => 'required|integer',
            'percentage' => 'nullable|numeric'
        ]);
        
        $userId = $request->user()->user_id;
        
        $percentage = $validated['percentage'] ?? 
            round(($validated['current_page'] / $validated['total_pages']) * 100, 2);
            
        $history = BookReadingHistory::updateOrCreate(
            [
                'user_id' => $userId,
                'book_id' => $validated['book_id']
            ],
            [
                'current_page' => $validated['current_page'],
                'total_pages' => $validated['total_pages'],
                'percentage' => $percentage,
                'last_read_at' => now()
            ]
        );
        
        return response()->json([
            'status' => true,
            'message' => 'Cập nhật tiến độ đọc sách thành công',
            'data' => $history
        ]);
    }
}

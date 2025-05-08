<?php

namespace App\Http\Controllers;

use App\Models\PdfReadingHistory;
use Illuminate\Http\Request;

class PdfHistoryController extends Controller
{
    public function getUserHistory(Request $request)
    {
        $userId = $request->user()->user_id;
        $history = PdfReadingHistory::where('user_id', $userId)
            ->orderBy('last_read_at', 'desc')
            ->get();
            
        return response()->json([
            'status' => true,
            'data' => $history
        ]);
    }
    
    public function updateHistory(Request $request)
    {
        $validated = $request->validate([
            'pdf_id' => 'required|integer',
            'current_page' => 'required|integer',
            'total_pages' => 'required|integer',
            'percentage' => 'nullable|numeric'
        ]);
        
        $userId = $request->user()->user_id;
        
        $percentage = $validated['percentage'] ?? 
            round(($validated['current_page'] / $validated['total_pages']) * 100, 2);
            
        $history = PdfReadingHistory::updateOrCreate(
            [
                'user_id' => $userId,
                'pdf_id' => $validated['pdf_id']
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
            'message' => 'Cập nhật tiến độ đọc tài liệu thành công',
            'data' => $history
        ]);
    }
}

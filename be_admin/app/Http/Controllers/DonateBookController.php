<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DonateBookController extends Controller
{
    /**
     * Get donation count for a user
     *
     * @return \Illuminate\Http\Response
     */
    public function getUserDonationsCount(Request $request)
    {
        try {
            // Lấy email từ request
            $email = $request->query('email');
            
            if (!$email) {
                return response()->json([
                    'count' => 0,
                    'message' => 'Email không được cung cấp'
                ]);
            }
            
            // Đếm số sách đã quyên góp cho email cụ thể từ database
            $count = DB::connection('mysql_frontend')
                ->table('donate_books')
                ->where('email', $email)
                ->count();
            
            return response()->json([
                'count' => $count
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting donations count:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'count' => 0,
                'message' => 'Có lỗi xảy ra khi lấy số lượng quyên góp: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get all donated books with pagination
     *
     * @return \Illuminate\Http\Response
     */
    public function getAllDonatedBooks(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 15);
            $page = $request->input('page', 1);
            
            // Lấy danh sách sách quyên góp từ database
            $donations = DB::connection('mysql_frontend')
                ->table('donate_books')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);
            
            return response()->json($donations);
        } catch (\Exception $e) {
            Log::error('Error getting donated books:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Có lỗi xảy ra khi lấy danh sách sách quyên góp: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get donation details by ID
     * 
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function getDonationById($id)
    {
        try {
            $donation = DB::connection('mysql_frontend')
                ->table('donate_books')
                ->where('id', $id)
                ->first();
                
            if (!$donation) {
                return response()->json([
                    'message' => 'Không tìm thấy thông tin quyên góp'
                ], 404);
            }
            
            return response()->json($donation);
        } catch (\Exception $e) {
            Log::error('Error getting donation details:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Có lỗi xảy ra khi lấy thông tin quyên góp: ' . $e->getMessage()
            ], 500);
        }
    }
} 
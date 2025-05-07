<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DonateBook;
use App\Models\Users;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class DonateBookController extends Controller
{
    /**
     * Store a newly donated book
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function donateBook(Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'book_file' => 'required|file|mimes:pdf,epub',
            'name_user' => 'required|string|max:255',
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Handle file upload
        if ($request->hasFile('book_file')) {
            $file = $request->file('book_file');
            $filename = time() . '_' . $file->getClientOriginalName();
            
            // Store file in storage/app/public/donated_books directory
            $path = $file->storeAs('donated_books', $filename, 'public');
            
            if (!$path) {
                return response()->json(['message' => 'Failed to upload file'], 500);
            }

            // Create donation record with submitted data
            $donation = DonateBook::create([
                'name_user' => $request->name_user,
                'title' => $request->title,
                'email' => $request->email,
                'file_path' => $path,
            ]);

            return response()->json([
                'message' => 'Book donated successfully',
                'donation' => $donation
            ], 201);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

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
            
            // Đếm số sách đã quyên góp cho email cụ thể
            $count = DonateBook::where('email', $email)->count();
            
            return response()->json([
                'count' => $count
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting donations count:', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'count' => 0,
                'message' => 'Có lỗi xảy ra khi lấy số lượng quyên góp'
            ]);
        }
    }

    /**
     * Get all donated books
     *
     * @return \Illuminate\Http\Response
     */
    public function getAllDonatedBooks()
    {
        $donations = DonateBook::orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'donations' => $donations
        ]);
    }
}

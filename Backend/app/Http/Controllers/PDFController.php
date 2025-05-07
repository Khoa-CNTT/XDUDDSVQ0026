<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PDF;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Access\AuthorizationException;

class PDFController extends Controller
{
    public function upload(Request $request)
    {
        try {
            DB::beginTransaction();

            // Validate request
            $request->validate([
                'file' => 'required|file|mimes:pdf|max:10240', // Max 10MB
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
            ]);

            // Store file
            $file = $request->file('file');
            $path = $file->store('pdfs', 'public');

            // Create PDF record
            $pdf = PDF::create([
                'title' => $request->title,
                'description' => $request->description,
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'original_name' => $file->getClientOriginalName(),
                'user_id' => Auth::user()->user_id,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'PDF uploaded successfully',
                'data' => $pdf
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            // Lấy thông tin người dùng hiện tại đã xác thực
            $user = Auth::user();
            
            // Lấy email/user_id từ request nếu có
            $requestEmail = $request->input('email');
            $requestUserId = $request->input('user_id');
            
            // Kiểm tra email hoặc user_id có khớp với người dùng đang đăng nhập
            if (($requestEmail && $user->email != $requestEmail) || 
                ($requestUserId && $user->id != $requestUserId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể xem tài liệu của tài khoản khác'
                ], 403);
            }
            
            // Tiếp tục thực hiện lấy tài liệu PDF của người dùng
            $pdfs = PDF::where('user_id', $user->user_id)->get();
            
            return response()->json([
                'success' => true,
                'data' => $pdfs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch PDFs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction();
            
            // Log input data
            Log::info('PDF upload request data', [
                'has_file' => $request->hasFile('file'),
                'all_inputs' => $request->all()
            ]);
            
            $request->validate([
                'file' => 'required|file|mimes:pdf|max:10240',
                'title' => 'nullable|string|max:255',
                'description' => 'nullable|string'
            ]);

            $file = $request->file('file');
            
            // Kiểm tra thư mục lưu trữ
            $storagePath = storage_path('app/public/pdfs');
            if (!file_exists($storagePath)) {
                Log::warning('Storage directory does not exist, creating it', ['path' => $storagePath]);
                mkdir($storagePath, 0755, true);
            }
            
            // Log thông tin file
            Log::info('PDF file info', [
                'original_name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getMimeType()
            ]);
            
            $path = $file->store('pdfs', 'public');
            Log::info('File stored at path', ['path' => $path]);

            $pdf = PDF::create([
                'user_id' => Auth::user()->user_id,
                'title' => $request->title ?? $file->getClientOriginalName(),
                'description' => $request->description,
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType()
            ]);
            
            Log::info('PDF record created', ['pdf_id' => $pdf->id]);
            
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'PDF uploaded successfully',
                'data' => $pdf
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PDF upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload PDF: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'file_exists' => $request->hasFile('file')
            ], 500);
        }
    }

    public function show(Request $request, PDF $pdf)
    {
        try {
            $user = Auth::user();
            
            // Kiểm tra người dùng hiện tại với người sở hữu tài liệu
            if ($user->user_id !== $pdf->user_id) {
                throw new AuthorizationException('You are not authorized to view this PDF.');
            }
            
            // Nếu có email hoặc user_id từ request, kiểm tra khớp với người dùng hiện tại
            $requestEmail = $request->input('email');
            $requestUserId = $request->input('user_id');
            
            if (($requestEmail && $user->email != $requestEmail) || 
                ($requestUserId && $user->id != $requestUserId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể xem tài liệu của tài khoản khác'
                ], 403);
            }
            
            return response()->json([
                'success' => true,
                'data' => $pdf
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, PDF $pdf)
    {
        try {
            if (Auth::user()->user_id !== $pdf->user_id) {
                throw new AuthorizationException('You are not authorized to update this PDF.');
            }

            $request->validate([
                'title' => 'nullable|string|max:255',
                'description' => 'nullable|string'
            ]);

            $pdf->update($request->only(['title', 'description']));
            return response()->json([
                'success' => true,
                'message' => 'PDF updated successfully',
                'data' => $pdf
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(PDF $pdf)
    {
        try {
            if (Auth::user()->user_id !== $pdf->user_id) {
                throw new AuthorizationException('You are not authorized to delete this PDF.');
            }

            Storage::disk('public')->delete($pdf->file_path);
            $pdf->delete();
            return response()->json([
                'success' => true,
                'message' => 'PDF deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function download(PDF $pdf)
    {
        try {
            if (Auth::user()->user_id !== $pdf->user_id) {
                throw new AuthorizationException('You are not authorized to download this PDF.');
            }

            if (!Storage::disk('public')->exists($pdf->file_path)) {
                Log::error('PDF file not found', [
                    'pdf_id' => $pdf->id,
                    'file_path' => $pdf->file_path,
                    'storage_path' => Storage::disk('public')->path($pdf->file_path)
                ]);
                throw new \Exception('File not found on server');
            }

            $file = Storage::disk('public')->path($pdf->file_path);
            
            // Log the file access attempt
            Log::info('PDF download requested', [
                'pdf_id' => $pdf->id,
                'user_id' => Auth::user()->user_id,
                'file_path' => $pdf->file_path,
                'absolute_path' => $file,
                'file_exists' => file_exists($file),
                'file_size' => file_exists($file) ? filesize($file) : 0,
                'file_mime' => file_exists($file) ? mime_content_type($file) : 'unknown'
            ]);
            
            if (!file_exists($file)) {
                Log::error('PDF file exists in storage but not on filesystem', [
                    'pdf_id' => $pdf->id,
                    'file_path' => $pdf->file_path,
                    'absolute_path' => $file
                ]);
                throw new \Exception('File exists in database but not on filesystem');
            }
            
            // Direct file response - simplest approach
            return response()->file($file, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $pdf->title . '.pdf"'
            ]);
        } catch (\Exception $e) {
            Log::error('PDF download failed', [
                'error' => $e->getMessage(),
                'pdf_id' => $pdf->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to download PDF: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Download a PDF file using token-based authentication
     * This is designed for iframe embedding where header-based authentication doesn't work well
     */
    public function downloadWithToken(Request $request, PDF $pdf)
    {
        try {
            // Get token from request
            $token = $request->query('token');
            
            if (empty($token)) {
                throw new \Exception('No authentication token provided');
            }
            
            // Validate token and get user
            $user = $this->getUserFromToken($token);
            
            if (!$user) {
                throw new AuthorizationException('Invalid authentication token');
            }
            
            // Check if user owns this PDF
            if ($user->user_id !== $pdf->user_id) {
                throw new AuthorizationException('You are not authorized to download this PDF');
            }
            
            // Check if file exists
            if (!Storage::disk('public')->exists($pdf->file_path)) {
                Log::error('PDF file not found', [
                    'pdf_id' => $pdf->id,
                    'file_path' => $pdf->file_path
                ]);
                throw new \Exception('File not found on server');
            }
            
            $file = Storage::disk('public')->path($pdf->file_path);
            
            // Check if file exists on filesystem
            if (!file_exists($file)) {
                Log::error('PDF file exists in storage but not on filesystem', [
                    'pdf_id' => $pdf->id,
                    'file_path' => $pdf->file_path,
                    'absolute_path' => $file
                ]);
                throw new \Exception('File exists in database but not on filesystem');
            }
            
            // Log successful access
            Log::info('PDF download with token', [
                'pdf_id' => $pdf->id,
                'user_id' => $user->user_id,
                'file_path' => $pdf->file_path,
                'file_size' => filesize($file),
                'file_mime' => mime_content_type($file)
            ]);
            
            // Serve the file
            return response()->file($file, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $pdf->title . '.pdf"'
            ]);
        } catch (\Exception $e) {
            Log::error('PDF download with token failed', [
                'error' => $e->getMessage(),
                'pdf_id' => $pdf->id ?? null
            ]);
            
            // Return a plain text error for iframe compatibility
            return response($e->getMessage(), 403)
                ->header('Content-Type', 'text/plain');
        }
    }
    
    /**
     * Get user from personal access token
     */
    private function getUserFromToken($token)
    {
        try {
            // Find token in personal_access_tokens table
            $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            
            if (!$tokenModel) {
                return null;
            }
            
            // Get token's associated user
            return $tokenModel->tokenable;
        } catch (\Exception $e) {
            Log::error('Error validating token: ' . $e->getMessage());
            return null;
        }
    }
} 
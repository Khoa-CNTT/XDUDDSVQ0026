<?php

namespace App\Http\Controllers;
use OpenAI;
use Illuminate\Http\Request;
use App\Models\PDF;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Access\AuthorizationException;
use App\Services\DocumentConversionService;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser;
use Dompdf\Dompdf;
use Dompdf\Options;

class PDFController extends Controller
{
    protected $documentConversionService;

    public function __construct(DocumentConversionService $documentConversionService = null)
    {
        // Sử dụng dependency injection có điều kiện để tránh ảnh hưởng đến các phương thức khác
        $this->documentConversionService = $documentConversionService;
    }

    public function upload(Request $request)
    {
        try {
            DB::beginTransaction();

            // Validate request
            $request->validate([
                'file' => 'required|file|mimes:pdf|max:40960', // Max 40MB (from 10MB)
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
        set_time_limit(0);
        try {
            DB::beginTransaction();
            
            // 1. Validate input
            Log::info('PDF upload request data', [
                'has_file'   => $request->hasFile('file'),
                'inputs'     => $request->all()
            ]);
            $request->validate([
                'file'        => 'required|file|mimes:pdf|max:40960',
                'title'       => 'nullable|string|max:255',
                'description' => 'nullable|string',
            ]);

            // 2. Lưu file gốc
            $file = $request->file('file');
            $path = $file->store('pdfs', 'public');
            Log::info('File stored at path', ['path' => $path]);

            // 3. Tạo record DB
            $pdf = PDF::create([
                'user_id' => Auth::user()->user_id,
                'title'     => $request->title ?? $file->getClientOriginalName(),
                'description' => $request->description,
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);
            Log::info('PDF record created', ['pdf_id' => $pdf->id]);

            // Kiểm tra kích thước file để quyết định có dịch hay không
            $fileSizeInMB = $file->getSize() / (1024 * 1024); // Convert to MB
            $sizeLimit = 0.50; // 0.50MB = 500KB
            
            $translateFile = $fileSizeInMB <= $sizeLimit;
            
            Log::info('File size check for translation', [
                'size_bytes' => $file->getSize(),
                'size_mb' => $fileSizeInMB,
                'limit_mb' => $sizeLimit,
                'will_translate' => $translateFile ? 'Yes' : 'No'
            ]);
            
            if ($translateFile) {
                // 4. Đọc text từ file gốc
                $fullPath = storage_path('app/public/' . $path);
                $parser   = new Parser();
                $text     = trim($parser->parseFile($fullPath)->getText());
    
                // 5. Chia nhỏ thành các chunk ~2000 ký tự
                $chunks = preg_split(
                    '/(?<=\.)\s+/',
                    wordwrap($text, 2000, "\n", true)
                );
    
                // 6. Dịch mỗi chunk với OpenAI
                $client     = OpenAI::client("");
                $translated = '';
                foreach ($chunks as $chunk) {
                    $resp = $client->chat()->create([
                        'model'       => 'gpt-3.5-turbo',
                      
                        'messages' => [
                [
                    'role'    => 'system',
                    'content' => 'Bạn là một chuyên gia dịch thuật. Nội dung đầu vào hoàn toàn bằng tiếng Việt, nhiệm vụ của bạn là dịch toàn bộ sang tiếng Anh và chỉ trả về văn bản tiếng Anh, không giữ lại bất kỳ đoạn tiếng Việt nào.'
                ],
                [
                    'role'    => 'user',
                    'content' => "Vui lòng dịch đoạn sau sang tiếng Anh:\n\n" . $chunk
                ],
            ],
                        'temperature' => 0.0,
                    ]);
                    $translated .= trim($resp->choices[0]->message->content) . "\n\n";
                }
    
                $options = new Options();
                $options->set('defaultFont', 'DejaVuSans');        // name you gave in load_font.php
                $options->set('isHtml5ParserEnabled', true);      // better UTF-8/CSS support
    
                $dompdf = new Dompdf();
                $dompdf->loadHtml(
                    '<div style="font-family: sans-serif; white-space: pre-wrap;">'
                    . e($translated) .
                    '</div>'
                );
                $dompdf->setPaper('A4');
                $dompdf->render();
                $output = $dompdf->output();
    
                // 8. Lưu file dịch và cập nhật DB
                $outPath = 'pdfs/translates/'
                         . now()->format('Ymd_His')
                         . "_{$pdf->id}_"
                         . uniqid()
                         . '.pdf';
                Storage::disk('public')->put($outPath, $output);
                $pdf->file_path_translate = $outPath;
                $pdf->save();
                Log::info('Translated PDF stored & DB updated', ['outPath' => $outPath]);
            } else {
                Log::info('Translation skipped due to file size limit', [
                    'pdf_id' => $pdf->id,
                    'size_mb' => $fileSizeInMB,
                    'limit_mb' => $sizeLimit
                ]);
            }

            DB::commit();

            return response()->json([
                'success'    => true,
                'message'    => $translateFile 
                    ? 'Upload & translate PDF thành công' 
                    : 'Upload PDF thành công (bỏ qua dịch do file quá lớn)',
                'data'       => [
                    'original_url'   => Storage::url($path),
                    'translated_url' => $translateFile ? Storage::url($outPath) : null,
                    'pdf_record'     => $pdf,
                    'translated'     => $translateFile,
                ],
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('PDF upload & translate failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi upload hoặc dịch PDF',
                'error'   => $e->getMessage(),
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

            // Delete reading history records
            \App\Models\PdfReadingHistory::where('pdf_id', $pdf->id)->delete();
            
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
     * Download the translated version of a PDF file
     */
    public function downloadTranslated(PDF $pdf)
    {
        try {
            if (Auth::user()->user_id !== $pdf->user_id) {
                throw new AuthorizationException('You are not authorized to download this PDF.');
            }

            // Kiểm tra xem PDF có bản dịch hay không
            if (!$pdf->file_path_translate || !Storage::disk('public')->exists($pdf->file_path_translate)) {
                // Log chi tiết để debug
                Log::error('Translated PDF file not found', [
                    'pdf_id' => $pdf->id,
                    'file_path_translate' => $pdf->file_path_translate ?? 'NULL',
                    'exists_in_storage' => $pdf->file_path_translate ? 
                        Storage::disk('public')->exists($pdf->file_path_translate) : false,
                    'absolute_path' => $pdf->file_path_translate ? 
                        Storage::disk('public')->path($pdf->file_path_translate) : 'NULL',
                    'all_fields' => $pdf->toArray()
                ]);
                
                throw new \Exception('Translated file not found on server');
            }

            $file = Storage::disk('public')->path($pdf->file_path_translate);
            
            // Log the file access attempt
            Log::info('Translated PDF download requested', [
                'pdf_id' => $pdf->id,
                'user_id' => Auth::user()->user_id,
                'file_path_translate' => $pdf->file_path_translate,
                'absolute_path' => $file,
                'file_exists' => file_exists($file),
                'storage_paths' => [
                    'public_path' => public_path(),
                    'storage_path' => storage_path(),
                    'storage_public_path' => storage_path('app/public')
                ]
            ]);
            
            if (!file_exists($file)) {
                Log::error('Translated PDF file exists in storage but not on filesystem', [
                    'pdf_id' => $pdf->id,
                    'file_path_translate' => $pdf->file_path_translate,
                    'absolute_path' => $file,
                    'storage_disk_files' => Storage::disk('public')->files('pdfs/translates')
                ]);
                throw new \Exception('Translated file exists in database but not on filesystem');
            }
            
            // Direct file response
            return response()->file($file, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $pdf->title . '_translated.pdf"'
            ]);
        } catch (\Exception $e) {
            Log::error('Translated PDF download failed', [
                'error' => $e->getMessage(),
                'pdf_id' => $pdf->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to download translated PDF: ' . $e->getMessage(),
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
     * Download a translated PDF file using token-based authentication
     * This is designed for iframe embedding where header-based authentication doesn't work well
     */
    public function downloadTranslatedWithToken(Request $request, PDF $pdf)
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
            
            // Check if translated file exists
            if (!$pdf->file_path_translate || !Storage::disk('public')->exists($pdf->file_path_translate)) {
                // Log chi tiết để debug
                Log::error('Translated PDF file not found (token access)', [
                    'pdf_id' => $pdf->id,
                    'file_path_translate' => $pdf->file_path_translate ?? 'NULL',
                    'exists_in_storage' => $pdf->file_path_translate ? 
                        Storage::disk('public')->exists($pdf->file_path_translate) : false,
                    'absolute_path' => $pdf->file_path_translate ? 
                        Storage::disk('public')->path($pdf->file_path_translate) : 'NULL',
                    'all_fields' => $pdf->toArray()
                ]);
                
                throw new \Exception('Translated file not found on server');
            }
            
            $file = Storage::disk('public')->path($pdf->file_path_translate);
            
            // Check if file exists on filesystem
            if (!file_exists($file)) {
                Log::error('Translated PDF file exists in storage but not on filesystem (token access)', [
                    'pdf_id' => $pdf->id,
                    'file_path_translate' => $pdf->file_path_translate,
                    'absolute_path' => $file,
                    'storage_disk_files' => Storage::disk('public')->files('pdfs/translates')
                ]);
                throw new \Exception('Translated file exists in database but not on filesystem');
            }
            
            // Log successful access
            Log::info('Translated PDF download with token', [
                'pdf_id' => $pdf->id,
                'user_id' => $user->user_id,
                'file_path_translate' => $pdf->file_path_translate,
                'file_size' => filesize($file),
                'file_mime' => mime_content_type($file),
                'storage_paths' => [
                    'public_path' => public_path(),
                    'storage_path' => storage_path(),
                    'storage_public_path' => storage_path('app/public')
                ]
            ]);
            
            // Serve the file
            return response()->file($file, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $pdf->title . '_translated.pdf"'
            ]);
        } catch (\Exception $e) {
            Log::error('Translated PDF download with token failed', [
                'error' => $e->getMessage(),
                'pdf_id' => $pdf->id ?? null,
                'trace' => $e->getTraceAsString()
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

    /**
     * Upload and convert DOCX file to PDF
     * Completely separate method from existing upload/store methods
     */
    public function uploadDocx(Request $request)
    {
        try {
            DB::beginTransaction();
            
            // Kiểm tra service có tồn tại không
            if (!$this->documentConversionService) {
                $this->documentConversionService = app(DocumentConversionService::class);
            }
            
            // Log input data
            Log::info('DOCX upload request data', [
                'has_file' => $request->hasFile('file'),
                'all_inputs' => $request->all()
            ]);
            
            $request->validate([
                'file' => 'required|file|mimes:docx,doc|max:102400', // Max 100MB (from 10MB)
                'title' => 'nullable|string|max:255',
                'description' => 'nullable|string'
            ]);

            $file = $request->file('file');
            
            // Lưu file DOCX gốc
            $originalDocxPath = 'docx_originals/' . Str::random(40) . '.' . $file->getClientOriginalExtension();
            $docxPath = Storage::disk('public')->putFileAs('', $file, $originalDocxPath);
            $docxSize = $file->getSize();
            
            // Đường dẫn tuyệt đối đến file DOCX gốc
            $absoluteDocxPath = Storage::disk('public')->path($originalDocxPath);
            
            // Thư mục đầu ra cho file PDF
            $outputDir = Storage::disk('public')->path('pdfs');
            
            // Đảm bảo thư mục tồn tại
            if (!file_exists($outputDir)) {
                mkdir($outputDir, 0755, true);
            }
            
            Log::info('Converting DOCX to PDF', [
                'docx_path' => $absoluteDocxPath,
                'output_dir' => $outputDir
            ]);
            
            // Chuyển đổi DOCX sang PDF
            $convertedPdfPath = $this->documentConversionService->convertDocxToPdf($absoluteDocxPath, $outputDir);
            
            if (!$convertedPdfPath) {
                throw new \Exception('Failed to convert DOCX to PDF');
            }
            
            // Lấy tên file không có đường dẫn
            $convertedFileName = basename($convertedPdfPath);
            
            // Đường dẫn lưu trữ cho file PDF (tương đối)
            $pdfRelativePath = 'pdfs/' . $convertedFileName;
            
            // Kích thước file PDF
            $pdfSize = filesize($convertedPdfPath);
            
            Log::info('DOCX converted to PDF successfully', [
                'pdf_path' => $pdfRelativePath,
                'pdf_size' => $pdfSize
            ]);
            
            // Tạo bản ghi PDF mới
            $pdf = PDF::create([
                'user_id' => Auth::user()->user_id,
                'title' => $request->title ?? pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
                'description' => $request->description ?? 'Converted from DOCX document',
                'file_path' => $pdfRelativePath,
                'file_size' => $pdfSize,
                'original_path' => $originalDocxPath,
                'original_size' => $docxSize,
                'mime_type' => 'application/pdf',
                'file_type' => 'docx_converted'
            ]);
            
            Log::info('PDF record created from DOCX', ['pdf_id' => $pdf->id]);
            
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'DOCX uploaded and converted to PDF successfully',
                'data' => $pdf
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('DOCX upload and conversion failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload and convert DOCX: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 
<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Book;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class BookController extends Controller
{
    /**
     * Display a listing of the books.
     */
    public function index(Request $request)
    {
        try {
            $query = Book::with(['author', 'category']);
            
            // Search functionality
            if ($request->has('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('name_book', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('title', 'LIKE', "%{$searchTerm}%");
                });
            }
            
            // Filter by category
            if ($request->has('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            
            // Filter by author
            if ($request->has('author_id')) {
                $query->where('author_id', $request->author_id);
            }
            
            // Sorting
            $sortField = $request->sort_by ?? 'created_at';
            $sortOrder = $request->sort_order ?? 'desc';
            $query->orderBy($sortField, $sortOrder);
            
            // Get all books without pagination for admin
            $books = $query->get();
            
            return response()->json([
                'success' => true,
                'data' => $books
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve books',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created book.
     */
    public function store(Request $request)
    {
        Log::info('Book creation request received', ['data' => $request->all()]);
        
        $validator = Validator::make($request->all(), [
            'name_book' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'author_id' => 'required|string|exists:authors,author_id',
            'category_id' => 'required|string|exists:categories,category_id',
            'price' => 'required_if:is_free,false|numeric|min:0',
            'is_free' => 'boolean',
            'pages' => 'nullable|integer|min:0',
            'image' => 'nullable',
            'file_path' => 'nullable',
        ]);
        
        if ($validator->fails()) {
            Log::error('Book validation failed', ['errors' => $validator->errors()->toArray()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }
        
        try {
            // Generate a unique book ID
            $bookId = 'B' . Str::random(8);
            
            // Handle image upload
            $imagePath = $request->image ?? null;
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imageName = time() . '.' . $image->getClientOriginalExtension();
                $image->move(public_path('images/books'), $imageName);
                $imagePath = 'images/books/' . $imageName;
            }
            
            // Handle PDF upload
            $pdfPath = $request->file_path ?? null;
            if ($request->hasFile('file_path')) {
                $pdf = $request->file('file_path');
                $pdfName = time() . '.' . $pdf->getClientOriginalExtension();
                $pdf->move(public_path('pdfs'), $pdfName);
                $pdfPath = 'pdfs/' . $pdfName;
            }
            
            $book = Book::create([
                'book_id' => $bookId,
                'name_book' => $request->name_book,
                'title' => $request->title,
                'author_id' => $request->author_id,
                'category_id' => $request->category_id,
                'price' => $request->is_free ? 0 : ($request->price ?? 0),
                'is_free' => $request->is_free ?? false,
                'pages' => $request->pages,
                'image' => $imagePath,
                'file_path' => $pdfPath,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            Log::info('Book created successfully', ['book_id' => $bookId]);
            
            return response()->json([
                'success' => true,
                'message' => 'Book created successfully',
                'data' => $book
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating book', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create book',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified book.
     */
    public function show($id)
    {
        $book = Book::with(['author', 'category'])->find($id);
        
        if (!$book) {
            return response()->json([
                'success' => false,
                'message' => 'Book not found'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $book
        ]);
    }

    /**
     * Update the specified book.
     */
    public function update(Request $request, $id)
    {
        $book = Book::find($id);
        
        if (!$book) {
            return response()->json([
                'success' => false,
                'message' => 'Book not found'
            ], 404);
        }
        
        $validator = Validator::make($request->all(), [
            'name_book' => 'string|max:255',
            'title' => 'string|max:255',
            'author_id' => 'string|exists:authors,author_id',
            'category_id' => 'string|exists:categories,category_id',
            'price' => 'numeric|min:0',
            'is_free' => 'boolean',
            'pages' => 'nullable|integer|min:1',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'file_path' => 'nullable|file|mimes:pdf|max:10240',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }
        
        // Handle image upload
        if ($request->hasFile('image')) {
            // Remove old image if exists
            if ($book->image && file_exists(public_path($book->image))) {
                unlink(public_path($book->image));
            }
            
            $image = $request->file('image');
            $imageName = time() . '.' . $image->getClientOriginalExtension();
            $image->move(public_path('images/books'), $imageName);
            $book->image = 'images/books/' . $imageName;
        }
        
        // Handle PDF upload
        if ($request->hasFile('file_path')) {
            // Remove old PDF if exists
            if ($book->file_path && file_exists(public_path($book->file_path))) {
                unlink(public_path($book->file_path));
            }
            
            $pdf = $request->file('file_path');
            $pdfName = time() . '.' . $pdf->getClientOriginalExtension();
            $pdf->move(public_path('pdfs'), $pdfName);
            $book->file_path = 'pdfs/' . $pdfName;
        }
        
        // Update book fields
        $book->name_book = $request->name_book ?? $book->name_book;
        $book->title = $request->title ?? $book->title;
        $book->author_id = $request->author_id ?? $book->author_id;
        $book->category_id = $request->category_id ?? $book->category_id;
        $book->price = $request->price ?? $book->price;
        
        if (isset($request->is_free)) {
            $book->is_free = $request->is_free;
        }
        
        $book->pages = $request->pages ?? $book->pages;
        $book->updated_at = now();
        
        $book->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Book updated successfully',
            'data' => $book
        ]);
    }

    /**
     * Remove the specified book.
     */
    public function destroy($id)
    {
        $book = Book::find($id);
        
        if (!$book) {
            return response()->json([
                'success' => false,
                'message' => 'Book not found'
            ], 404);
        }
        
        // Remove image if exists
        if ($book->image && file_exists(public_path($book->image))) {
            unlink(public_path($book->image));
        }
        
        // Remove PDF if exists
        if ($book->file_path && file_exists(public_path($book->file_path))) {
            unlink(public_path($book->file_path));
        }
        
        $book->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Book deleted successfully'
        ]);
    }

    /**
     * Handle file upload for books
     * 
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function upload(Request $request)
    {
        try {
            Log::info('Book upload request received', ['files' => $request->allFiles()]);
            
            $validator = Validator::make($request->all(), [
                'pdf_file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            ]);
            
            if ($validator->fails()) {
                Log::error('Book upload validation failed', ['errors' => $validator->errors()]);
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            if ($request->hasFile('pdf_file')) {
                $file = $request->file('pdf_file');
                $extension = $file->getClientOriginalExtension();
                $fileName = time() . '_' . Str::random(10) . '.' . $extension;
                
                // Determine directory based on file type
                if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif'])) {
                    $directory = 'images/books';
                    $file->move(public_path($directory), $fileName);
                    $fileType = 'image';
                } else {
                    $directory = 'pdfs';
                    $file->move(public_path($directory), $fileName);
                    $fileType = 'pdf';
                }
                
                $filePath = $directory . '/' . $fileName;
                Log::info('File uploaded successfully', ['path' => $filePath, 'type' => $fileType]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'File uploaded successfully',
                    'file_path' => $filePath,
                    'file_type' => $fileType,
                    'file_name' => $fileName
                ]);
            }
            
            Log::warning('No file provided in book upload request');
            return response()->json([
                'success' => false,
                'message' => 'No file provided'
            ], 400);
        } catch (\Exception $e) {
            Log::error('Error uploading file', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload file',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

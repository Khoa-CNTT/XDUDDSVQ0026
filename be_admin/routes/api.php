<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BookController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\AuthorController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\DonateBookController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Debug route to check database status
Route::get('/debug', function() {
    $data = [
        'books_count' => \App\Models\Book::count(),
        'categories_count' => \App\Models\Category::count(),
        'authors_count' => \App\Models\Author::count(),
        'users_count' => \App\Models\User::count(),
        'sample_books' => \App\Models\Book::take(2)->get(),
        'sample_categories' => \App\Models\Category::take(2)->get(),
        'sample_authors' => \App\Models\Author::take(2)->get(),
        'sample_users' => \App\Models\User::take(2)->get()
    ];
    
    return response()->json([
        'success' => true,
        'message' => 'Debug information',
        'data' => $data
    ]);
});

// Debug route for book validation
Route::post('/debug/book-validation', function(\Illuminate\Http\Request $request) {
    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
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
    
    return response()->json([
        'success' => !$validator->fails(),
        'data' => $request->all(),
        'errors' => $validator->errors(),
        'passes' => $validator->passes()
    ]);
});

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);

// Donate books routes
Route::get('/user-donations-count', [DonateBookController::class, 'getUserDonationsCount']);
Route::get('/donated-books', [DonateBookController::class, 'getAllDonatedBooks']);
Route::get('/donated-books/{id}', [DonateBookController::class, 'getDonationById']);

// Temporarily adding these routes without auth for testing
Route::get('/dashboard', [DashboardController::class, 'index']);
Route::apiResource('books', BookController::class);

// Custom route for book uploads - must be placed before apiResource to prevent conflicts
Route::post('/books/upload', [BookController::class, 'upload']);

Route::apiResource('categories', CategoryController::class);
Route::apiResource('authors', AuthorController::class);
Route::apiResource('users', UserController::class);

// Protected routes - using only Sanctum for authentication
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // These routes are now duplicated - we'll remove the duplicates after testing
    // Dashboard
    // Route::get('/dashboard', [DashboardController::class, 'index']);
    
    // Books management
    // Route::apiResource('books', BookController::class);
    
    // Categories management
    // Route::apiResource('categories', CategoryController::class);
    
    // Authors management
    // Route::apiResource('authors', AuthorController::class);
    
    // Users management
    // Route::apiResource('users', UserController::class);
});

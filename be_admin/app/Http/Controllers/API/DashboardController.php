<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Category;
use App\Models\Author;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function index()
    {
        try {
            // Book statistics
            $totalBooks = Book::count();
            $freeBooks = Book::where('is_free', true)->count();
            $paidBooks = $totalBooks - $freeBooks;
            
            // Category statistics
            $totalCategories = Category::count();
            $categoriesWithBooks = Category::withCount('books')
                ->having('books_count', '>', 0)
                ->get()
                ->map(function ($category) {
                    return [
                        'id' => $category->category_id,
                        'name' => $category->name_category,
                        'book_count' => $category->books_count
                    ];
                });
                
            // Author statistics
            $totalAuthors = Author::count();
            $topAuthors = Author::withCount('books')
                ->orderBy('books_count', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($author) {
                    return [
                        'id' => $author->author_id,
                        'name' => $author->name_author,
                        'book_count' => $author->books_count
                    ];
                });
                
            // User statistics
            $totalUsers = User::count();
            
            // Revenue statistics (mock data since we don't have actual sales data)
            $revenue = [
                'total' => 10000, // Mock total revenue
                'monthly' => 2500, // Mock monthly revenue
                'weekly' => 500,   // Mock weekly revenue
                'daily' => 100,    // Mock daily revenue
            ];
            
            return response()->json([
                'success' => true,
                'data' => [
                    'books' => [
                        'total' => $totalBooks,
                        'free' => $freeBooks,
                        'paid' => $paidBooks,
                    ],
                    'categories' => [
                        'total' => $totalCategories,
                        'distribution' => $categoriesWithBooks,
                    ],
                    'authors' => [
                        'total' => $totalAuthors,
                        'top' => $topAuthors,
                    ],
                    'users' => [
                        'total' => $totalUsers,
                    ],
                    'revenue' => $revenue,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve dashboard statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

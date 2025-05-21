<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\AuthorController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\PDFController;
use App\Http\Controllers\DonateBookController;
use App\Http\Controllers\UserBookPreferenceController;
use App\Http\Controllers\BookHistoryController;
use App\Http\Controllers\PdfHistoryController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Auth routes
Route::post('/dang-nhap', [UsersController::class, 'dangNhap']);
Route::post('/dang-ky', [UsersController::class, 'dangKy']);
Route::post('/quen-mat-khau', [UsersController::class, 'quenMatKhau']);

// Public route with token parameter for iframe PDF viewing
Route::get('/pdfs/{pdf}/download-with-token', [PDFController::class, 'downloadWithToken']);
Route::get('/pdfs/{pdf}/download-translated-with-token', [PDFController::class, 'downloadTranslatedWithToken']);

// Public Book routes
Route::get('/books', [BookController::class, 'danhSach']);
Route::get('/books/free', [BookController::class, 'sachMienPhi']);
Route::get('/books/trending', [BookController::class, 'xuHuong']);
Route::get('/books/paid', [BookController::class, 'sachCoPhi']);
Route::get('/books/search', [BookController::class, 'timKiem']);
Route::get('/books/category/{categoryId}', [BookController::class, 'theoTheLoai']);
Route::get('/books/author/{authorId}', [BookController::class, 'theoTacGia']);
Route::get('/books/{id}', [BookController::class, 'chiTiet']);
Route::get('/books/{id}/view-pdf', [BookController::class, 'viewPdf']);
Route::get('/books/{bookId}/pdf', [BookController::class, 'viewPdf']);
// Public Category routes
Route::get('/categories', [CategoryController::class, 'danhSach']);
Route::get('/categories/{id}', [CategoryController::class, 'chiTiet']);

// Public Donate Book routes
Route::post('/donate-book', [DonateBookController::class, 'donateBook']);
Route::get('/user-donations-count', [DonateBookController::class, 'getUserDonationsCount']);
Route::get('/donated-books', [DonateBookController::class, 'getAllDonatedBooks']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // User routes
    Route::get('/user', [UsersController::class, 'getData']);
    Route::post('/dang-xuat', [UsersController::class, 'dangXuat']);
    Route::post('/doi-mat-khau', [UsersController::class, 'doiMatKhau']);
    Route::post('/cap-nhat-thong-tin', [UsersController::class, 'capNhatThongTin']);
    Route::get('/devices', [UsersController::class, 'getDevices']);
    Route::delete('/devices/{tokenId}', [UsersController::class, 'logoutDevice']);
    Route::delete('/devices', [UsersController::class, 'logoutAllDevices']);
    Route::delete('/all-devices', [UsersController::class, 'logoutAllDevicesIncludingCurrent']);

    // Protected Book routes
    Route::post('/books', [BookController::class, 'themMoi']);
    Route::put('/books/{id}', [BookController::class, 'capNhat']);
    Route::delete('/books/{id}', [BookController::class, 'xoa']);
    Route::post('/books/extract-cover', [BookController::class, 'extractCover']);
    Route::post('/books/upload', [BookController::class, 'upload']);
    
    // Author routes
    Route::get('/authors', [AuthorController::class, 'danhSach']);
    Route::get('/authors/search', [AuthorController::class, 'timKiem']);
    Route::get('/authors/{id}', [AuthorController::class, 'chiTiet']);
    Route::post('/authors', [AuthorController::class, 'themMoi']);
    Route::put('/authors/{id}', [AuthorController::class, 'capNhat']);
    Route::delete('/authors/{id}', [AuthorController::class, 'xoa']);
    
    // Protected Category routes
    Route::post('/categories', [CategoryController::class, 'themMoi']);
    Route::put('/categories/{id}', [CategoryController::class, 'capNhat']);
    Route::delete('/categories/{id}', [CategoryController::class, 'xoa']);

    // PDF routes
    Route::get('/pdfs', [PDFController::class, 'index']);
    // Route::post('/pdfs', [PDFController::class, 'store']);
    Route::post('/pdfs/upload', [PDFController::class, 'upload']);
    Route::get('/pdfs/{pdf}', [PDFController::class, 'show']);
    Route::put('/pdfs/{pdf}', [PDFController::class, 'update']);
    Route::delete('/pdfs/{pdf}', [PDFController::class, 'destroy']);
    Route::get('/pdfs/{pdf}/download', [PDFController::class, 'download']);
    Route::get('/pdfs/{pdf}/download-translated', [PDFController::class, 'downloadTranslated']);
    Route::post('/docx/upload', [PDFController::class, 'uploadDocx']);
    Route::post('/pdfs/translate', [PDFController::class, 'translate']);

    // User book preferences routes
    Route::post('/books/{id}/save', [UserBookPreferenceController::class, 'luuSach']);
    Route::post('/books/{id}/favorite', [UserBookPreferenceController::class, 'yeuThichSach']);
    Route::get('/user-books', [UserBookPreferenceController::class, 'getUserBooks']);

    // API cho lịch sử đọc sách
    Route::get('/book-history', [BookHistoryController::class, 'getUserHistory']);
    Route::post('/book-history', [BookHistoryController::class, 'updateHistory']);
    
    // API cho lịch sử đọc PDF
    Route::get('/pdf-history', [PdfHistoryController::class, 'getUserHistory']);
    Route::post('/pdf-history', [PdfHistoryController::class, 'updateHistory']);
    Route::post('/pdfs', [PDFController::class, 'store']);

});


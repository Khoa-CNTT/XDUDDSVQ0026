<?php

use App\Http\Controllers\UsersController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/users/dang-nhap', [UsersController::class, 'dangNhap']);
Route::post('/users/dang-ky', [UsersController::class, 'dangKy']);
Route::post('/users/dang-xuat', [UsersController::class, 'dangXuat']);
Route::get('/users/get-data', [UsersController::class, 'getData']);
Route::post('/users/quen-mat-khau', [UsersController::class, 'quenMatKhau']);
Route::post('/users/reset-mat-khau', [UsersController::class, 'resetMatKhau']);
Route::get('/users/doi-mat-khau', [UsersController::class, 'doiMatKhau']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users/devices', [UsersController::class, 'getDevices']);
    Route::post('/users/logout-device/{tokenId}', [UsersController::class, 'logoutDevice']);
    Route::post('/users/logout-all-devices', [UsersController::class, 'logoutAllDevices']);
});
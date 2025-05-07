<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_book_preferences', function (Blueprint $table) {
            $table->id();
            $table->string('user_id');
            $table->string('book_id');
            $table->boolean('is_saved')->default(false);
            $table->boolean('is_favorite')->default(false);
            $table->timestamps();

            // Tạo khóa ngoại
            $table->foreign('book_id')->references('book_id')->on('books')->onDelete('cascade');
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            
            // Đảm bảo mỗi người dùng chỉ có một bản ghi cho mỗi sách
            $table->unique(['user_id', 'book_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_book_preferences');
    }
}; 
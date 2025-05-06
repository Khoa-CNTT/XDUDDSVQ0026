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
        Schema::create('books', function (Blueprint $table) {
            $table->string('book_id', 10)->primary();
            $table->string('name_book', 400)->charset('utf8mb4');
            $table->text('title')->charset('utf8mb4');
            $table->string('image', 100)->nullable();
            $table->date('created_at');
            $table->string('author_id', 10);
            $table->string('category_id', 10);
            $table->decimal('price', 10, 2);
            $table->boolean('is_free')->default(false);
            $table->integer('is_favorite')->default(0);
            $table->integer('is_saved')->default(0);
            $table->timestamp('updated_at')->nullable();
            
            $table->foreign('author_id')->references('author_id')->on('authors');
            $table->foreign('category_id')->references('category_id')->on('categories');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('books');
    }
}; 
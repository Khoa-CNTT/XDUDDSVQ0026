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
        Schema::create('pdf_reading_histories', function (Blueprint $table) {
            $table->id();
            $table->string('user_id'); // FK tới bảng users
            $table->unsignedBigInteger('pdf_id'); // FK tới bảng pdfs
            $table->integer('current_page')->default(1);
            $table->integer('total_pages')->default(1);
            $table->decimal('percentage', 5, 2)->default(0);
            $table->timestamp('last_read_at');
            $table->timestamps();

            $table->unique(['user_id', 'pdf_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pdf_reading_histories');
    }
};

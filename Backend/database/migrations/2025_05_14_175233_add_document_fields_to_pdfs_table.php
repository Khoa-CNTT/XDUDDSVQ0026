<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddDocumentFieldsToPdfsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('pdfs', function (Blueprint $table) {
            $table->string('original_path')->nullable()->after('file_path');
            $table->integer('original_size')->nullable()->after('file_size');
            $table->string('file_type')->default('pdf')->after('original_size');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('pdfs', function (Blueprint $table) {
            $table->dropColumn(['original_path', 'original_size', 'file_type']);
        });
    }
}

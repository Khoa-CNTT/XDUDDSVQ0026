<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PDF extends Model
{
    use HasFactory;

    // Chỉ định tên bảng chính xác
    protected $table = 'pdfs';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'file_path',
        'file_size',
        'original_path',
        'original_size',
        'mime_type',
        'file_type',
        'file_path_translate'
    ];

    protected $casts = [
        'file_size' => 'integer'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
} 
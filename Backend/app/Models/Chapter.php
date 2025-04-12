<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Chapter extends Model
{
    use HasFactory;

    protected $primaryKey = ['book_id', 'chapter'];
    public $incrementing = false;

    protected $fillable = [
        'book_id',
        'chapter',
        'chapter_title',
    ];

    public function book()
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id');
    }
} 
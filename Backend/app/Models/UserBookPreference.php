<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserBookPreference extends Model
{
    use HasFactory;

    protected $table = 'user_book_preferences';
    
    protected $fillable = [
        'user_id',
        'book_id',
        'is_saved',
        'is_favorite'
    ];

    protected $casts = [
        'is_saved' => 'boolean',
        'is_favorite' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(Users::class, 'user_id', 'user_id');
    }

    public function book()
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id');
    }
} 
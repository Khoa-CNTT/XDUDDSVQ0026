<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Book extends Model
{
    use HasFactory;

    protected $primaryKey = 'book_id';
    public $incrementing = false;
    protected $keyType = 'string';
    
    // Override timestamps behavior since we have a custom created_at
    public $timestamps = false;

    protected $fillable = [
        'book_id',
        'name_book',
        'title',
        'image',
        'created_at',
        'author_id',
        'category_id',
        'price',
        'is_free',
        'is_favorite',
        'is_saved',
        'pages',
        'file_path',
        'updated_at'
    ];

    protected $casts = [
        'created_at' => 'date',
        'updated_at' => 'datetime',
        'price' => 'decimal:2',
        'is_free' => 'boolean',
        'is_favorite' => 'integer',
        'is_saved' => 'integer',
        'pages' => 'integer',
    ];


    public function author()
    {
        return $this->belongsTo(Author::class, 'author_id', 'author_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function chapters()
    {
        return $this->hasMany(Chapter::class, 'book_id', 'book_id');
    }
    public function reviews()
    {
        return $this->hasMany(Review::class, 'book_id', 'book_id');
    }
} 
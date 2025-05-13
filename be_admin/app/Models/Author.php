<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Author extends Model
{
    use HasFactory;

    protected $primaryKey = 'author_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'author_id',
        'name_author',
        'bio',
        'nationality',
        'birth_date',
        'death_date',
        'image_author',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'death_date' => 'date',
    ];

    public function books()
    {
        return $this->hasMany(Book::class, 'author_id', 'author_id');
    }
}

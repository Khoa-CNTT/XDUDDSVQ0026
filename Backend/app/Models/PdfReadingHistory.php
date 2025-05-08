<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PdfReadingHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'pdf_id',
        'current_page',
        'total_pages',
        'percentage',
        'last_read_at'
    ];

    protected $casts = [
        'last_read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(Users::class, 'user_id', 'user_id');
    }

    public function pdf()
    {
        return $this->belongsTo(PDF::class, 'pdf_id');
    }
}

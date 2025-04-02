<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected $table = 'personal_access_tokens';
    protected $fillable = [
        'name',
        'token',
        'abilities',
        'device_type',
        'device_name',
        'ip_address',
        'last_used_at',
    ];
} 
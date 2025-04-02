<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Str;
use Laravel\Sanctum\NewAccessToken;

class Users extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';
    protected $fillable = ['name', 'email', 'password'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = [
        'password' => 'hashed',
    ];

    /**
     * Tạo token mới với thông tin thiết bị
     */
    public function createToken(string $name, array $abilities = ['*'], array $deviceInfo = [])
    {
        $token = $this->tokens()->create([
            'name' => $name,
            'token' => hash('sha256', $plainTextToken = Str::random(40)),
            'abilities' => $abilities,
            'device_type' => $deviceInfo['device_type'] ?? null,
            'device_name' => $deviceInfo['device_name'] ?? null,
            'ip_address' => $deviceInfo['ip_address'] ?? null,
            'last_used_at' => $deviceInfo['last_used_at'] ?? now(),
        ]);

        return new NewAccessToken($token, $token->id.'|'.$plainTextToken);
    }
}


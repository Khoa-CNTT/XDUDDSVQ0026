<?php

namespace Database\Seeders;

use App\Models\Users;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
class UsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Users::create([
            'user_id' => "K" . Str::random(4),
            'name_user' => 'Lê Đức Huy',
            'email' => 'abc@gmail.com',
            'password' => bcrypt('123123'),
        ]);
    }
} 
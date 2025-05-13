<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\AdminUser;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create super admin user
        AdminUser::create([
            'name' => 'Admin',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('123123'),
            'role' => 'admin',
            'is_active' => true,
        ]);
        
        // Create editor user
        AdminUser::create([
            'name' => 'Editor',
            'email' => 'editor@gmail.com',
            'password' => Hash::make('123123'),
            'role' => 'editor',
            'is_active' => true,
        ]);
    }
}

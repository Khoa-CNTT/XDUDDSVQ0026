<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckUserMatch
{
    /**
     * Kiểm tra xem email/user_id có khớp với người dùng đang đăng nhập không
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        
        // Nếu không có người dùng đăng nhập, chuyển sang middleware xác thực
        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }
        
        $requestEmail = $request->input('email');
        $requestUserId = $request->input('user_id');
        
        // Kiểm tra email hoặc user_id có khớp với người dùng đang đăng nhập
        if (($requestEmail && $user->email != $requestEmail) || 
            ($requestUserId && $user->user_id != $requestUserId)) {
            return response()->json([
                'status' => false,
                'message' => 'Không thể thực hiện hành động với tài khoản khác'
            ], 403);
        }
        
        return $next($request);
    }
}

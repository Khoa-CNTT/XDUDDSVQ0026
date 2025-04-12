<?php

namespace App\Http\Controllers;

use App\Models\Users;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\MasterMail;
use Illuminate\Support\Facades\Auth;
class UsersController extends Controller
{
    public function dangNhap(Request $request)
    {
        $user = Users::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'status'    => false,
                'message'   => "Tài khoản chưa tồn tại, vui lòng đăng ký!",
            ], 200, ['Content-Type' => 'application/json']);
        }

        if (Hash::check($request->password, $user->password)) {
            $token = $user->createToken('token_user', ['*'], $this->getDeviceInfo($request));
            
            return response()->json([
                'status'    => true,
                'message'   => "Đã đăng nhập thành công!",
                'ten_user'  => $user->name_user,
                'token'     => $token->plainTextToken,
            ], 200, ['Content-Type' => 'application/json']);
        } else {
            return response()->json([
                'status'    => false,
                'message'   => "Tài khoản hoặc mật khẩu không đúng!",
            ], 200, ['Content-Type' => 'application/json']);
        }
    }

    private function getDeviceInfo(Request $request)
    {
        $userAgent = $request->header('User-Agent');
        $deviceType = 'unknown';
        $deviceName = 'unknown';
        
        if (strpos($userAgent, 'Android') !== false) {
            $deviceType = 'Android';
        } elseif (strpos($userAgent, 'iPhone') !== false || strpos($userAgent, 'iPad') !== false) {
            $deviceType = 'iOS';
        } elseif (strpos($userAgent, 'Windows') !== false) {
            $deviceType = 'Windows';
        } elseif (strpos($userAgent, 'Macintosh') !== false) {
            $deviceType = 'Mac';
        } elseif (strpos($userAgent, 'Linux') !== false) {
            $deviceType = 'Linux';
        }
        
        if ($request->has('device_name')) {
            $deviceName = $request->device_name;
        }
        
        return [
            'device_type' => $deviceType,
            'device_name' => $deviceName,
            'ip_address' => $request->ip(),
            'last_used_at' => now(),
        ];
    }

    public function dangKy(Request $request)
    {
        $validator = validator($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => "Định dạng email không hợp lệ!",
                'errors' => $validator->errors()
            ]);
        }
        $user = Users::where('email', $request->email)->first();

        if($user){
            return response()->json([
                'status' => false,
                'message' => "Email đã tồn tại!",
            ]);
        }
        
        $data = $request->all();
        $data['user_id'] = 'K' . Str::random(6);
        
        $user = Users::create($data);
        return response()->json([
            'status'    => true,
            'message'   => "Đã đăng ký thành công!",
        ]);
    }
    
    public function dangXuat(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json([
            'status'    => true,
            'message'   => "Đã đăng xuất thành công!",
        ]);
    }
    public function getData(Request $request)
    {
        return response()->json($request->user());
    }
    public function quenMatKhau(Request $request)
    {
        $user = Users::where('email', $request->email)->first();
        if($user){
            $newPassword = Str::random(8);            
            $user->password = Hash::make($newPassword);
            $user->save();
            
            $data = [
                'ho_va_ten' => $user->name_user ?? $user->username,
                'mat_khau' => $newPassword
            ];
            Mail::to($request->email)->send(new MasterMail('Thông Tin Mật Khẩu Mới Của Bạn', 'quen_mat_khau', $data));
            return response()->json([
                'status'    =>  true,
                'message'   =>  'Vui lòng kiểm tra email để lấy mật khẩu mới!'
            ]);
        } else {
            return response()->json([
                'status'    =>  false,
                'message'   =>  'Email không có trong hệ thống!'
            ]);
        }
    }   

    /**
     * Lấy danh sách thiết bị đã đăng nhập
     */
    public function getDevices(Request $request)
    {
        $tokens = $request->user()->tokens()->with('tokenable')->get()->map(function ($token) use ($request) {
            return [
                'id' => $token->id,
                'device_type' => $token->device_type ?? 'Không xác định',
                'device_name' => $token->device_name ?? 'Không xác định',
                'ip_address' => $token->ip_address ?? 'Không xác định',
                'last_used_at' => $token->last_used_at ? $token->last_used_at->format('d/m/Y H:i:s') : 'Chưa sử dụng',
                'created_at' => $token->created_at->format('d/m/Y H:i:s'),
                'is_current_device' => $token->id === $request->user()->currentAccessToken()->id
            ];
        });

        return response()->json([
            'status' => true,
            'devices' => $tokens
        ]);
    }

    /**
     * Đăng xuất khỏi một thiết bị cụ thể
     */
    public function logoutDevice(Request $request, $tokenId)
    {
        $token = $request->user()->tokens()->find($tokenId);
        
        if (!$token) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy thiết bị!'
            ]);
        }
        
        $token->delete();
        
        return response()->json([
            'status' => true,
            'message' => 'Đã đăng xuất khỏi thiết bị thành công!'
        ]);
    }

    /**
     * Đăng xuất khỏi tất cả các thiết bị trừ thiết bị hiện tại
     */
    public function logoutAllDevices(Request $request)
    {
        // Lấy token hiện tại
        $currentTokenId = $request->user()->currentAccessToken()->id;
        
        // Xóa tất cả token khác
        $request->user()->tokens()->where('id', '!=', $currentTokenId)->delete();
        
        return response()->json([
            'status' => true,
            'message' => 'Đã đăng xuất khỏi tất cả các thiết bị khác!'
        ]);
    }

    /**
     * Đăng xuất khỏi tất cả các thiết bị bao gồm cả thiết bị hiện tại
     */
    public function logoutAllDevicesIncludingCurrent(Request $request)
    {
        $request->user()->tokens()->delete();
        
        return response()->json([
            'status' => true,
            'message' => 'Đã đăng xuất khỏi tất cả các thiết bị!'
        ]);
    }
}

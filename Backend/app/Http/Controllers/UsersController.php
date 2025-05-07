<?php

namespace App\Http\Controllers;

use App\Models\Users;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\MasterMail;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

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
            // Get device information
            $deviceInfo = $this->getDeviceInfo($request);
            
            // Create token with device information passed correctly as third parameter
            $token = $user->createToken('token_user', ['*'], $deviceInfo);
            
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
        }
        
        if ($request->has('device_name')) {
            $deviceName = $request->device_name;
        } else if ($request->has('deviceName')) {
            $deviceName = $request->deviceName;
        } else {
            // Try to extract device name from user agent
            $deviceName = $this->extractDeviceNameFromUserAgent($userAgent);
        }
        
        return [
            'device_type' => $deviceType,
            'device_name' => $deviceName,
            'ip_address' => $request->ip(),
            'last_used_at' => now(),
        ];
    }

    /**
     * Extract a more meaningful device name from the User-Agent string
     */
    private function extractDeviceNameFromUserAgent($userAgent)
    {
        $deviceName = 'unknown';
        
        // Common patterns to extract device information from User-Agent
        if (preg_match('/\((.+?)\)/', $userAgent, $matches)) {
            $deviceInfo = $matches[1];
            $deviceParts = explode(';', $deviceInfo);
            
            if (count($deviceParts) > 1) {
                $deviceName = trim($deviceParts[1]);
            } else {
                $deviceName = trim($deviceParts[0]);
            }
        }
        
        return $deviceName;
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
            $newPassword = Str::random(6);            
            $user->password = Hash::make($newPassword);
            $user->save();
            
            $data = [
                'name' => $user->name_user ?? $user->username,
                'password' => $newPassword
            ];
            Mail::to($request->email)->send(new MasterMail('Thông Tin Mật Khẩu Mới Của Bạn', 'mail.quen_mat_khau', $data));
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

    // /**
    //  * Đăng xuất khỏi một thiết bị cụ thể
    //  */
    // public function logoutDevice(Request $request, $tokenId)
    // {
    //     $token = $request->user()->tokens()->find($tokenId);
        
    //     if (!$token) {
    //         return response()->json([
    //             'status' => false,
    //             'message' => 'Không tìm thấy thiết bị!'
    //         ]);
    //     }
        
    //     $token->delete();
        
    //     return response()->json([
    //         'status' => true,
    //         'message' => 'Đã đăng xuất khỏi thiết bị thành công!'
    //     ]);
    // }

    // /**
    //  * Đăng xuất khỏi tất cả các thiết bị trừ thiết bị hiện tại
    //  */
    // public function logoutAllDevices(Request $request)
    // {
    //     // Lấy token hiện tại
    //     $currentTokenId = $request->user()->currentAccessToken()->id;
        
    //     // Xóa tất cả token khác
    //     $request->user()->tokens()->where('id', '!=', $currentTokenId)->delete();
        
    //     return response()->json([
    //         'status' => true,
    //         'message' => 'Đã đăng xuất khỏi tất cả các thiết bị khác!'
    //     ]);
    // }

    // /**
    //  * Đăng xuất khỏi tất cả các thiết bị bao gồm cả thiết bị hiện tại
    //  */
    // public function logoutAllDevicesIncludingCurrent(Request $request)
    // {
    //     $request->user()->tokens()->delete();
        
    //     return response()->json([
    //         'status' => true,
    //         'message' => 'Đã đăng xuất khỏi tất cả các thiết bị!'
    //     ]);
    // }

    /**
     * Đổi mật khẩu cho người dùng đã đăng nhập
     */
    public function doiMatKhau(Request $request)
    {
        $user = $request->user();
        
        // Validate request
        $validator = validator($request->all(), [
            'current_password' => 'required',
            'new_password' => 'required|min:6',
            'confirm_password' => 'required|same:new_password',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors()
            ]);
        }
        
        // Check if current password is correct
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'status' => false,
                'message' => 'Mật khẩu hiện tại không đúng'
            ]);
        }
        
        // Update password
        $user->password = Hash::make($request->new_password);
        $user->save();
        
        return response()->json([
            'status' => true,
            'message' => 'Đổi mật khẩu thành công'
        ]);
    }

    /**
     * Cập nhật thông tin người dùng
     */
    public function capNhatThongTin(Request $request)
    {
        $user = $request->user();
        
        // Validate request
        $validator = validator($request->all(), [
            'name_user' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors()
            ]);
        }
        
        // Update user info
        $user->name_user = $request->name_user;
        $user->save();
        
        return response()->json([
            'status' => true,
            'message' => 'Cập nhật thông tin thành công',
            'user' => $user
        ]);
    }
}

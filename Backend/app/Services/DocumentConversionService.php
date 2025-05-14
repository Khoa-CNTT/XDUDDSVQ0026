<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class DocumentConversionService
{
    /**
     * Chuyển đổi tệp DOCX sang PDF
     *
     * @param string $sourcePath Đường dẫn đến tệp DOCX
     * @param string $outputDir Thư mục đầu ra cho tệp PDF
     * @return string|null Đường dẫn đến tệp PDF đã chuyển đổi hoặc null nếu thất bại
     */
    public function convertDocxToPdf($sourcePath, $outputDir = null)
    {
        try {
            // Xác định thư mục đầu ra nếu không được cung cấp
            if (!$outputDir) {
                $outputDir = dirname($sourcePath);
            }

            // Đảm bảo thư mục đầu ra tồn tại
            if (!is_dir($outputDir)) {
                mkdir($outputDir, 0755, true);
            }

            // Xác định tên tệp đầu ra
            $filename = pathinfo($sourcePath, PATHINFO_FILENAME);
            $outputPath = $outputDir . '/' . $filename . '.pdf';

            // Đường dẫn LibreOffice trên Windows - ĐIỀU CHỈNH NẾU CẦN
            $libreOfficePath = '"C:\Program Files\LibreOffice\program\soffice.exe"';
            
            // Trên Windows, cần chuyển đổi đường dẫn với dấu gạch chéo ngược
            $windowsSourcePath = str_replace('/', '\\', $sourcePath);
            $windowsOutputDir = str_replace('/', '\\', $outputDir);
            
            // Tạo lệnh cmd cho Windows
            $command = "{$libreOfficePath} --headless --convert-to pdf --outdir \"{$windowsOutputDir}\" \"{$windowsSourcePath}\"";
            
            // Thực thi lệnh cmd
            exec($command, $output, $returnCode);
            
            if ($returnCode !== 0) {
                Log::error('Lỗi khi chuyển đổi DOCX sang PDF. Mã trả về: ' . $returnCode);
                Log::error('Output: ' . implode("\n", $output));
                return null;
            }
            
            Log::info('DOCX đã được chuyển đổi thành công: ' . $outputPath);
            
            // Kiểm tra xem tệp PDF đã được tạo hay chưa
            if (file_exists($outputPath)) {
                return $outputPath;
            } else {
                Log::error('Chuyển đổi hoàn tất nhưng không tìm thấy tệp PDF: ' . $outputPath);
                return null;
            }
        } catch (\Exception $e) {
            Log::error('Lỗi khi chuyển đổi DOCX sang PDF: ' . $e->getMessage());
            return null;
        }
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\Book;
use App\Models\Author;
use App\Models\Category;

class BookSeeder extends Seeder
{
    /**
     * Danh sách các chủ đề phổ biến ở Việt Nam để tìm kiếm
     * Giảm xuống chỉ 5 chủ đề để có tổng 50 cuốn sách
     */
    protected $topics = [
        'Văn học Việt Nam',
        'Sách kinh doanh',
        'Sách tâm lý học',
        'Sách thiếu nhi',
        'Tiểu thuyết trinh thám'
    ];

    // Số lượng sách tối đa muốn seed
    protected $maxBooks = 50;

    // Số lượng sách đã thêm
    protected $bookCount = 0;

    /**
     * Danh sách tác giả Việt Nam phổ biến
     */
    protected $popularAuthors = [
        'Nguyễn Nhật Ánh',
        'Nguyễn Ngọc Tư',
        'Nguyễn Phong Việt',
        'Trang Hạ',
        'Anh Khang',
        'Nguyễn Ngọc Thạch',
        'Nguyễn Quang Thiều',
        'Nguyễn Đông Thức'
    ];

    /**
     * Danh sách thể loại
     */
    protected $categories = [
        'CAT000001' => 'Văn học Việt Nam',
        'CAT000002' => 'Truyện ngắn',
        'CAT000003' => 'Tiểu thuyết',
        'CAT000004' => 'Kinh tế - Kinh doanh',
        'CAT000005' => 'Tâm lý - Kỹ năng sống',
        'CAT000006' => 'Thiếu nhi',
        'CAT000007' => 'Học ngoại ngữ',
        'CAT000008' => 'Trinh thám',
        'CAT000009' => 'Khoa học - Công nghệ',
        'CAT000010' => 'Lịch sử',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Bắt đầu seed dữ liệu sách từ Google Books API...');
        $this->command->info('Giới hạn tối đa ' . $this->maxBooks . ' cuốn sách');

        // Seed categories
        $this->seedCategories();
        
        // Seed authors
        $this->seedAuthors();

        // Lấy sách từ Google Books API với mỗi chủ đề
        foreach ($this->topics as $index => $topic) {
            // Kiểm tra xem đã đủ số lượng sách tối đa chưa
            if ($this->bookCount >= $this->maxBooks) {
                $this->command->info("Đã đạt đến số lượng tối đa " . $this->maxBooks . " cuốn sách");
                break;
            }

            $this->command->info("Đang lấy sách với chủ đề: {$topic}");
            $this->fetchBooksForTopic($topic, $index);
            
            // Nghỉ một chút để tránh bị Google giới hạn yêu cầu
            sleep(2);
        }

        $this->command->info('Hoàn thành seed dữ liệu sách! Đã thêm ' . $this->bookCount . ' cuốn sách');
    }

    /**
     * Seed categories
     */
    protected function seedCategories(): void
    {
        $this->command->info('Seeding categories...');
        
        foreach ($this->categories as $id => $name) {
            Category::updateOrCreate(
                ['category_id' => $id],
                ['name_category' => $name]
            );
        }
    }

    /**
     * Seed authors
     */
    protected function seedAuthors(): void
    {
        $this->command->info('Seeding authors...');
        
        // Thêm một số tác giả mặc định
        $authors = [
            [
                'author_id' => 'AUTH000001',
                'name_author' => 'Nguyễn Nhật Ánh',
                'bio' => 'Nhà văn Việt Nam nổi tiếng với các tác phẩm về tuổi học trò và tuổi thơ.',
                'nationality' => 'Việt Nam',
                'birth_date' => '1955-05-07',
            ],
            [
                'author_id' => 'AUTH000002',
                'name_author' => 'Nguyễn Ngọc Tư',
                'bio' => 'Nhà văn, nhà thơ người Việt Nam, nổi tiếng với nhiều tác phẩm về đời sống miền Tây Nam Bộ.',
                'nationality' => 'Việt Nam',
                'birth_date' => '1976-01-01',
            ],
            [
                'author_id' => 'AUTH000003',
                'name_author' => 'Rosie Nguyễn',
                'bio' => 'Tác giả của nhiều cuốn sách về phát triển bản thân.',
                'nationality' => 'Việt Nam',
                'birth_date' => '1987-01-01',
            ],
            [
                'author_id' => 'AUTH000004',
                'name_author' => 'Trang Hạ',
                'bio' => 'Nhà văn, nhà báo nổi tiếng với những tác phẩm về phụ nữ hiện đại.',
                'nationality' => 'Việt Nam',
                'birth_date' => '1975-01-01',
            ],
            [
                'author_id' => 'AUTH000005',
                'name_author' => 'Dale Carnegie',
                'bio' => 'Tác giả nổi tiếng với các tác phẩm về phát triển bản thân và kỹ năng giao tiếp.',
                'nationality' => 'Mỹ',
                'birth_date' => '1888-11-24',
                'death_date' => '1955-11-01',
            ]
        ];

        foreach ($authors as $author) {
            Author::updateOrCreate(
                ['author_id' => $author['author_id']],
                $author
            );
        }
    }

    /**
     * Fetch books from Google Books API for a specific topic
     */
    protected function fetchBooksForTopic(string $topic, int $topicIndex): void
    {
        // Phân bổ category ID dựa trên chủ đề
        $categoryId = 'CAT' . str_pad(($topicIndex % 10) + 1, 6, '0', STR_PAD_LEFT);
        
        try {
            // Tính toán số sách còn lại cần thêm để đạt đến tối đa
            $booksNeeded = $this->maxBooks - $this->bookCount;
            $maxResults = min(10, $booksNeeded);
            
            // Nếu không cần thêm sách nữa, thoát khỏi hàm
            if ($maxResults <= 0) {
                return;
            }
            
            // Lấy sách từ Google Books API với số lượng được điều chỉnh
            $response = Http::get('https://www.googleapis.com/books/v1/volumes', [
                'q' => $topic,
                'langRestrict' => 'vi',
                'maxResults' => $maxResults,
                'orderBy' => 'relevance',
                'printType' => 'books'
            ]);

            if ($response->successful() && isset($response['items'])) {
                $books = $response['items'];
                
                foreach ($books as $index => $book) {
                    // Kiểm tra xem đã đạt đến giới hạn chưa
                    if ($this->bookCount >= $this->maxBooks) {
                        break;
                    }
                    
                    $volumeInfo = $book['volumeInfo'] ?? null;
                    
                    if (!$volumeInfo) {
                        continue;
                    }

                    // Tạo book_id ngẫu nhiên theo định dạng
                    $bookId = 'BOOK' . Str::random(6);
                    
                    // Lấy tên tác giả từ API hoặc sử dụng tác giả mặc định
                    $authorName = $volumeInfo['authors'][0] ?? $this->getRandomAuthor();
                    $authorId = $this->getAuthorIdByName($authorName);
                    
                    // Đảm bảo mỗi sách có thumbnail
                    $imageUrl = $volumeInfo['imageLinks']['thumbnail'] ?? null;
                    if (!$imageUrl) {
                        $imageUrl = 'https://via.placeholder.com/128x192?text=No+Image';
                    }

                    // Định dạng ngày tạo
                    $publishedDate = $volumeInfo['publishedDate'] ?? date('Y-m-d');
                    try {
                        $publishedDate = substr($publishedDate, 0, 10);
                        $date = new \DateTime($publishedDate);
                        $formattedDate = $date->format('Y-m-d');
                    } catch (\Exception $e) {
                        $formattedDate = date('Y-m-d');
                    }

                    // Create book record
                    Book::updateOrCreate(
                        ['book_id' => $bookId],
                        [
                            'name_book' => $volumeInfo['title'] ?? 'Unknown Title',
                            'title' => $volumeInfo['subtitle'] ?? $volumeInfo['title'] ?? 'Unknown Title',
                            'image' => $imageUrl,
                            'created_at' => $formattedDate,
                            'author_id' => $authorId,
                            'category_id' => $categoryId,
                            'price' => 0,
                            'is_free' => true,
                            'file_path' => null, // No PDF path for sample data
                            'updated_at' => now()
                        ]
                    );

                    $this->bookCount++;
                    $this->command->info("Added book " . $this->bookCount . "/" . $this->maxBooks . ": " . ($volumeInfo['title'] ?? 'Unknown Title'));
                }
            } else {
                $this->command->error("Could not fetch data for topic: {$topic}");
            }
        } catch (\Exception $e) {
            $this->command->error("Error: " . $e->getMessage());
        }
    }

    /**
     * Get a random author from the list
     */
    protected function getRandomAuthor(): string
    {
        return $this->popularAuthors[array_rand($this->popularAuthors)];
    }

    /**
     * Get author ID by name, create if not exists
     */
    protected function getAuthorIdByName(string $name): string
    {
        // Kiểm tra xem tác giả đã có trong cơ sở dữ liệu chưa
        $author = Author::where('name_author', $name)->first();
        
        if ($author) {
            return $author->author_id;
        }
        
        // Nếu tác giả chưa có, tạo mới
        $authorId = 'AUTH' . Str::random(6);
        Author::create([
            'author_id' => $authorId,
            'name_author' => $name,
            'bio' => 'Thông tin về tác giả chưa cập nhật.',
            'nationality' => 'Chưa xác định',
            'birth_date' => null,
        ]);
        
        return $authorId;
    }
} 
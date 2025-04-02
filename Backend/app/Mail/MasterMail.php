<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MasterMail extends Mailable
{
    use Queueable, SerializesModels;
    
        public $tille;
        public $view;
        public $data;
    
        public function __construct($a, $b, $c)
        {
            $this->tille = $a;
            $this->view = $b;
            $this->data = $c;
        }
    
        public function build()
        {
            return $this->subject($this->tille)->view($this->view, ['data' => $this->data]);
        }
}

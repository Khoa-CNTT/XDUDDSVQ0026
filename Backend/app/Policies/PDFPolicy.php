<?php

namespace App\Policies;

use App\Models\PDF;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PDFPolicy
{
    use HandlesAuthorization;

    public function view(User $user, PDF $pdf)
    {
        return $user->id === $pdf->user_id;
    }

    public function update(User $user, PDF $pdf)
    {
        return $user->id === $pdf->user_id;
    }

    public function delete(User $user, PDF $pdf)
    {
        return $user->id === $pdf->user_id;
    }
} 
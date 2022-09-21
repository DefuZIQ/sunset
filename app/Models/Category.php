<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'image_id'
    ];
    public function products()
    {
        return $this->belongsToMany(Product::class);
    }
    public function images()
    {
        return $this->belongsToMany(Image::class);
    }
}
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('products', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->char('title', 50);
            $table->text('description');
            $table->float('price', 8, 2);
            $table->integer('image_id')->index();
            $table->integer('category_id')->index();
            $table->boolean('active')->default(1);
            $table->timestamp('date_create', $precision=0)->useCurrent();
            $table->timestamp('date_update', $precision=0)->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('products');
    }
};

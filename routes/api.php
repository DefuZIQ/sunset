<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

/*
* Получение списка продуктов из таблицы Products
*/
Route::get('/products', [ProductController::class, "ShowProducts"]);
/*
* Получение одного продукта из таблицы Products по ID
*/
Route::get('/products/{id}', [ProductController::class, "ShowProduct"]);

/*
* Получение списка категорий из таблицы Categories
*/
Route::get('/categories', [CategoryController::class, "ShowCategories"]);
/*
* Получение одной категории из таблицы Categories по ID
*/
Route::get('/categories/{id}', [CategoryController::class, "ShowCategory"]);

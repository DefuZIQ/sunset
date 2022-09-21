<?php 
use Illuminate\Support\Facades\Storage;
?>
<main>
        <div class="main__body">
            <section>
                <div class="main__background">
                    <div class="main__collection container">
                        <div class="main__coll_h2 text-muted"><h2>ЛЕТНЯЯ<br>КОЛЛЕКЦИЯ</h2></div>
                        <button type="submit" class="coll__button_arrow" onclick="location.href= '#'">В каталог<image src="image\button-arrow.png" width="30px"></image></button>
                    </div>
                </div>
            </section>
            <section>
                <div class="main__cards container">
                    <div class="new__card_title">
                        <hr>
                            <h2>НОВИНКИ</h2>
                        <hr>
                    </div>
                    <div class="new__card products row">
                        <!-- Сюда подключить новинки товаров-->
                        <script>
                            $.ajax({
                                url: "/api/products",
                                type: "GET",
                                dataType: "json",
                                success(data) {
                                    for (let index in data) {
                                        $('.products').append(`
                                        <div class="products__card_body col-3">
                                        <div class="prod${data[index].id}hover"></div>
                                            <div class="products__card_content">
                                                    <p class="products__card_name">${data[index].title}</p>
                                                    <p class="products__card_price">${data[index].price}₽</p>
                                                </div>
                                        </div>
                                    <style>
                                    .prod${data[index].id}hover {
                                        background: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%),url("${data[index].image_url}");
                                        background-size: cover;
                                        width: 100%;
                                        height: 53.2vh;
                                        position: relative;
                                        z-index: 5;
                                    }
                                    .prod${data[index].id}hover:before
                                    {
                                        background: linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0%, rgba(255, 253, 251, 0.1) 100%), url("${data[index].image_url}");
                                        background-size: cover;
                                        width: 100%;
                                        height: 100%;
                                        position: absolute;
                                        z-index: -5;
                                        transition: opacity 1s;
                                        top: 0; 
                                        left: 0;
                                        opacity: 0;
                                        content: ""; 
                                    }
                                    .prod${data[index].id}hover:hover:before {
                                        opacity: 1;
                                    }
                                    </style>
                                        `)
                                    }
                                }
                            })
                        </script>
                    </div>
                    <div class="catalog__view d-flex justify-content-center">
                        <a href="$">СМОТРЕТЬ КАТАЛОГ</a>
                    </div>
                </div>
            </section>
            <section>
                <div class="main__categories container">
                    <div class="category__title">
                        <hr>
                            <h2>КАТЕГОРИИ ТОВАРОВ</h2>
                        <hr>
                    </div>
                    <div class="category__card categoies row">
                        <!-- Сюда подключить категории товаров-->
                        <script>
                            $.ajax({
                                url: "/api/categories",
                                type: "GET",
                                dataType: "json",
                                success(data) {
                                    for (let index in data) {
                                        $('.categoies').append(`
                                            <div class="categorycard cat${data[index].id}hover col-4">
                                                <p>${data[index].name}</p>
                                                <style>
                                                .cat${data[index].id}hover {
                                                    background-image: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%),url("${data[index].image_url}");
                                                    background-size: cover;
                                                    transition: 1s;
                                                    position: relative;
                                                    z-index: 5;
                                                    
                                                }
                                                .cat${data[index].id}hover:before
                                                {
                                                    background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0%, rgba(255, 253, 251, 0.1) 100%), url("${data[index].image_url}");
                                                    background-size: cover;
                                                    width: 100%;
                                                    height: 100%;
                                                    position: absolute;
                                                    z-index: -5;
                                                    transition: opacity 1s;
                                                    top: 0; 
                                                    left: 0;
                                                    opacity: 0;
                                                    content: ""; 
                                                }
                                                .cat${data[index].id}hover:hover:before {
                                                    opacity: 1;
                                                }
                                                .cat${data[index].id}hover p {
                                                text-transform: uppercase;
                                                }
                                            </style>
                                            `)
                                    }
                                }
                            })
                        </script>
                    </div>
                </div>
            </section>
            <section>
                <div class="main__subscribe_background">
                    <div class="main__subscribe_body container">
                        <div class="main__subscribe__inline row">
                            <div class="main__subscribe_title col-4">
                                <p class="main__subscribe_one">Скидка 10% за подписку</p>
                                <p class="main__subscribe_two">Узнавай первым о новинках и скидках</p>
                                    </div>
                            <div class="main__subscribe_form col-6">
                                <form action="/include/subscribe.php" method="POST">
                                    <input class="form__subinput_one" type="text" name="email" value="" placeholder="Ваш e-mail" required>
                                    <input class="form__subinput_two" type="submit" value="Подписаться">
                                </form>
                            </div>
                            <div class="main__subscribe_social col-2">
                                <img src="image\Instagram.png" width="72px" height="66px">
                                <img src="image\Telegram.png" width="60px" height="72px">
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </main>
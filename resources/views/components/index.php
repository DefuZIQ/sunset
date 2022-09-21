<!DOCTYPE html> <!-- Объявление формата документа -->
<html>
<head> <!-- Техническая информация о документе -->
<meta charset="UTF-8"> <!-- Определяем кодировку символов документа -->
<title>SUNSET</title> <!-- Задаем заголовок документа -->
<link rel="stylesheet" type="text/css" href="css\main.css"> <!-- Подключаем внешнюю таблицу стилей -->
<script src="/js/main.js"></script> <!-- Подключаем сценарии -->

</head>
<body> <!-- Основная часть документа -->
<header>
    <div class="header-back" id="header">
        <div class="header-line">
            <div class="logo">
                <a href="/">SUNSET</a>
            </div>
            <nav>
                    <a class="menu">О НАС</a>
                    <a class="menu">КАТАЛОГ</a>
                    <a class="menu">НОВИНКИ</a>
                    <a class="menu">КОНТАКТЫ</a>
            </nav>
            <div class="lastmenu">
                    <button class="search"><a onclick="popupSearch()"><image src="/image/search.png"></image></a></button>
                    <button class="likes"><image src="/image/likes.png"></image></button>
                    <button class="basket"><image src="/image/basket.png"></image></button>
                    <button class="avatar"><a onclick="popupAuth()"><image src="image\avatar.png"></image></a></button>
           </div>
        </div>
    </div>
</header>
<main>
<div class="main">
    <div class="collection">
       <div class="collh2"><h2>ЛЕТНЯЯ<br>КОЛЛЕКЦИЯ</h2></div>
       <button type="submit" class="button-arrow" onclick="location.href= '#'">В каталог<image src="image\button-arrow.png" width="30px"></image></button>
    </div>

</div>
<section>
    <div class="newblock">
        <hr>
        <h2>НОВИНКИ</h2>
        <hr>
    </div>
    <div class="newcard">
        <div class="card">
            <img src="image\products\1.png">
            <div class="cardobj">
                <p class="cardname">Боди</p>
                <p class="cardprice">2699 ₽</p>
            </div>
        </div>
        <div class="card">
            <img src="image\products\2.png">
            <div class="cardobj">
                <p class="cardname">Пиджак</p>
                <p class="cardprice">3399 ₽</p>
            </div> 
        </div>
        <div class="card">
            <img src="image\products\3.png">
            <div class="cardobj">
                <p class="cardname">Боди</p>
                <p class="cardprice">2999 ₽</p>
            </div>
        </div>
        <div class="card">
            <img src="image\products\4.png">
            <div class="cardobj">
                <p class="cardname">Боди</p>
                <p class="cardprice">2999 ₽</p>
            </div>
        </div>
    </div>
    <div class="viewcatalog">
        <a href="$">СМОТРЕТЬ КАТАЛОГ</a>
    </div>
    <div class="categoryblock">
        <hr>
        <h3>КАТЕГОРИИ ТОВАРОВ</h2>
        <hr>
    </div>
    <div class="categorycoll">
        <div class="categorycard">
            <p>ВЕРХНЯЯ ОДЕЖДА</p>
            <img src="/image/categories/cat1.png">
        </div>
        <div class="categorycard">
            <p>ПЛАТЬЯ</p>
            <img src="/image/categories/cat2.png">
        </div>
        <div class="categorycard">
            <p>ПИДЖАКИ</p>
            <img src="/image/categories/cat3.png">
        </div>
        <div class="categorycard">
            <p>ДЖИНСЫ</p>
            <img src="/image/categories/cat4.png">
        </div>
        <div class="categorycard">
            <p>КОФТЫ</p>
            <img src="/image/categories/cat5.png">
        </div>
        <div class="categorycard">
            <p>ЮБКИ</p>
            <img src="/image/categories/cat6.png">
        </div>
    </div>
    <div class="subscribe">
            <div class="subscribeobj">
                <div id="subscribetext">
                    <p class="subscribetext1">Скидка 10% за подписку</p>
                    <p class="subscribetext2">Узнавай первым о новинках и скидках</p>
                        </div>
                <div class="formsubscribe">
                    <form action="/include/subscribe.php" method="POST">
                        <input class="subinput_one" type="text" name="email" value="" placeholder="Ваш e-mail" required>
                        <input class="subinput_two" type="submit" value="Подписаться">
                    </form>
                </div>
                <div class="socseti">
                    <image src="image\Instagram.png">
                    <image src="image\Telegram.png">
                </div>
            </div>
    </div>
</section>
</main>

<footer>
    <div class="footer-line">
        <div class="footer-block">
        <div class="footer-block-logo">
            <p>SUNSET</p>
            <img src="">
        </div>
        <div class="footer-block-one">
            <h3>Магазин</h3>
            <a>Новая коллекция</a>
            <a>О нас</a>
            <a>Рассылка</a>
        </div>
        <div class="footer-block-two">
            <h3>Каталог</h3>
            <a>Летняя коллекция</a>
            <a>Платья</a>
            <a>Доставка</a>
            <a>Контакты</a>
        </div>
        <div class="footer-block-three">
            <h3>Контакты</h3>
            <p>+7(920)022-01-22</p>
            <p>Ежедневно с 9:00 до 21:00</p>
            <p>г.Нижний Новгород, ул.Большая Покровская, д.34</p>
        </div>
    </div>
</div>
</footer>
<div id="popup" class="popup">
    <div class="popup__body">
        <div class="popup__content">
            <a class="popup__close" onclick="popupAuthClose();"><img src="/image/icons/Union.png"></a>
                <div class="popup__title"><p>Вход\Регистрация</p></div>
                <div class="popup__text">
                    <form action="/include/auth.php" method="POST">
                        <input class="authinput" type="text" name="login" value="" placeholder="E-mail" required><br>
                        <input class="authinput" type="text" name="password" value="" placeholder="Пароль" required><br>
                        <div class="reginput-line">
                            <input class="reginput_one" type="submit" value="Создать аккаунт">
                            <input class="reginput_two" type="submit" value="Войти">
                        </div>
                    </form>
                </div>
        </div>
    </div>
</div>
<div id="popup__search" class="popup__search">
        <div class="popup__search_content">
            <a class="popup__search_close" onclick="popupSearchClose();"><img src="/image/icons/Union.png"></a>
            <div class="popup__search_title"><p>SUNSET</p></div>
            <div class="popup__search_text">
                <form>
                    <img src="/image/search-input.png">
                    <input class="search__input" type="text" placeholder="Введите название товара">
                    <input class="search__reset" type="reset" value="Очистить">
                </form>
            </div>
        </div>
</div>
</body>
</html>
<header>
    <div class="header-back" id="header">
        <div class="header-line row">
            <div class="logo">
                <a href="/">SUNSET</a>
            </div>
            <nav>
                    <a class="menu" href="about_us">О НАС</a>
                    <a class="menu" href="catalog">КАТАЛОГ</a>
                    <a class="menu" href="catalog">НОВИНКИ</a>
                    <a class="menu" href="contacts">КОНТАКТЫ</a>
            </nav>
            <div class="lastmenu">
                    <button class="search"><a onclick="popupSearch()"><image src="/image/search.png"></image></a></button>
                    <button class="likes"><image src="/image/likes.png"></image></button>
                    <button class="basket"><image src="/image/basket.png"></image></button>
                    <button class="avatar"><a onclick="popupAuth()"><image src="image/avatar.png"></image></a></button>
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
                <div class="popup__title"><a>Вход</a><p>\</p><a href="register">Регистрация</a></div>
                <div class="popup__text">
                    <form action="/auth/login" method="POST">
                        <input class="authinput" type="text" name="email" value="" placeholder="E-mail" required maxlength="32"><br>
                        <input class="authinput" type="password" name="password" value="" placeholder="Пароль" required maxlength="20"><br>
                        <div class="authinput-line">
                            <input class="authsubmit" type="submit" value="Войти">
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
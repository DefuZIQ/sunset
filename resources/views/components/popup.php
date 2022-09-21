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
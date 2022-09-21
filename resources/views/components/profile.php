<main>
<div class="profile">
    <div class="profile__margin">
        <div class="profile__nav">
            <div class="profile__avatar">
            <img width="150" height="150" src="<?php print_r($_SESSION["user"]["avatar"]) ?>">
            <p><?php print_r ($_SESSION["user"]["surname"]) .' ' .print_r ($_SESSION["user"]["name"])?></p>
            </div>
            <div class="profile__nav_column">
                <div class="profile__nav_img"><img src="../image/profile.png"><div class="profile__nav_1"><a href="">Мои данные</a></div></div>
                <div class="profile__nav_img"><img src="../image/profile_likes.png"><div class="profile__nav_2"><a href="">Избранное</a></div></div>
                <div class="profile__nav_img"><img src="../image/profile_bascket.png"><div class="profile__nav_3"><a href="">Мои заказы</a></div></div>
            </div>
            <div class="profile__exit"></div>
        </div>
        <div class="profile__block">
            <div class="profile__filter"></div>
            <div class="profile__content"></div>
        </div>
    </div>
</div>
</main>
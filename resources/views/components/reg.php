    <main>
        <div class="reg__body">
            <div class="reg__content">
                <div class="reg__title"><p>Регистрация</p></div>
                <div class="reg__text">
                    <form action="/auth/register" method="POST" enctype="multipart/form-data">
                        <input class="authinput" type="text" name="surname" value="" placeholder="Фамилия" required maxlength="32"><br>
                        <input class="authinput" type="text" name="name" value="" placeholder="Имя" required maxlength="32"><br>
                        <input class="authinput" type="text" name="email" value="" placeholder="E-mail" required maxlength="32"><br>
                        <input class="authinput" type="file" name="avatar"><br>
                        <input class="authinput" type="password" name="password" value="" placeholder="Пароль" required maxlength="20"><br>
                        <input class="authinput" type="password" name="password_confirm" value="" placeholder="Повторите пароль" required maxlength="20"><br>
                        <div class="reginput-line">
                            <input class="regsubmit" type="submit" value="Создать аккаунт">
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </main>
     
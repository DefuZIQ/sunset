<?php
use App\Models\Page;
?>
<!DOCTYPE html> <!-- Объявление формата документа -->
<html>
<head> <!-- Техническая информация о документе -->
<meta charset="UTF-8"> <!-- Определяем кодировку символов документа -->
<title>SUNSET - Регистрация</title> <!-- Задаем заголовок документа -->
<link rel="stylesheet" type="text/css" href="css\main.css">
<link rel="stylesheet" type="text/css" href="css\reg.css">
<link rel="stylesheet" type="text/css" href="css\popup.css">  <!-- Подключаем внешнюю таблицу стилей -->
<script src="/js/main.js"></script> <!-- Подключаем сценарии -->
</head>
<body> <!-- Основная часть документа -->
<?php page::part(part_name:'header');?>
<?php page::part(part_name:'reg');?>
<?php page::part(part_name:'footer');?>
<?php page::part(part_name:'popup');?>

</body>
</html>
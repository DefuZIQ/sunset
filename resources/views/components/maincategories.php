<?php
use App\Http\Controllers\Controller\CategoriesController;

if ($result !== false){
    while ($row = mysqli_fetch_array($result)){
        echo '<div class="categorycard cat'.$row["id"].'hover">';
        echo '<p>'.$row["name"].'</p>'; 
        echo '<style>
        .cat'.$row["id"].'hover {
            background-image: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%),url("'.$row["image_url"].'");
            background-size: cover;
            transition: 1s;
            position: relative;
            z-index: 5;
            
        }
        .cat'.$row["id"].'hover:before
        {
            background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0%, rgba(255, 253, 251, 0.1) 100%), url("'.$row["image_url"].'");
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
        .cat'.$row["id"].'hover:hover:before {
            opacity: 1;
        }
        .cat'.$row["id"].'hover p {
        text-transform: uppercase;
        }
    </style>';
        echo '</div>'; 
    } 
        } 
        else{ echo 'Ничего не найдено!'; } 

?>
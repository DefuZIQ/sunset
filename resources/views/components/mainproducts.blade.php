<script>
$.ajax({
    url: "/api/products",
    type: "GET",
    dataType: "json",
    success(data) {
        for (let index in data) {
            $('.products').append(`
            <div class="card">
            <div class="prod.${data[index].id}.hover"></div>
                <div class="cardobj">
                        <p class="cardname">${data[index].title}</p>
                        <p class="cardprice">${data[index].price}₽</p>
                    </div>
            </div>
        <style>
        .prod.${data[index].id}.hover {
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%),url("'.$row["image_url"].'");
            background-size: cover;
            width: 100%;
            height: 53.2vh;
            position: relative;
            z-index: 5;
        }
        .prod.${data[index].id}.hover:before
        {
            background: linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0%, rgba(255, 253, 251, 0.1) 100%), url("'.$row["image_url"].'");
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
        .prod.${data[index].id}.hover:hover:before {
            opacity: 1;
        }
        </style>';
            `)
        }
    }
})
</script>
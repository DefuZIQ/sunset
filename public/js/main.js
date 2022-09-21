function popupAuth(){
    const popup = document.getElementById('popup');
    popup.classList.toggle('active');
    document.body.style.overflow = "hidden";
}
function popupAuthClose(){
    const popup = document.getElementById('popup');
    popup.classList.toggle('active');
    document.body.style.overflow = "";
}
function popupSearch(){
    const popupSearch = document.getElementById('popup__search');
    popupSearch.classList.toggle('active');
    document.body.style.overflow = "hidden";
}
function popupSearchClose(){
    const popupSearch = document.getElementById('popup__search');
    popupSearch.classList.toggle('active');
    document.body.style.overflow = "";
}

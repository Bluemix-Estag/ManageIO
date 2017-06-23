$('.button-collapse').sideNav();

$('.collapsible').collapsible();

$('select').material_select();

function getProjectID(id) {
    var id = document.getElementById(id);

    return id;

}

$('#textarea1').val('New Text');
$('#textarea1').trigger('autoresize');

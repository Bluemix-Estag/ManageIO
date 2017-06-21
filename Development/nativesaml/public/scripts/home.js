

var USER = {};

function collectLoggedUser() {

    var firstname = document.getElementById('user_firstName');
    if (firstname != null && firstname.value != '') {
        USER = {
            firstname : firstname.value,
            lastname : document.getElementById('user_lastName').value,
            email :  document.getElementById('user_emailaddress').value,
            uid: document.getElementById('user_uid').value
        }
    }

    alert(JSON.stringify(USER));
}

collectLoggedUser();


